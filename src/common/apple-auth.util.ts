import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';

type AppleJwk = crypto.JsonWebKey & { kid?: string };

let cachedKeys: AppleJwk[] | null = null;
let cachedAt = 0;
const CACHE_MS = 60 * 60 * 1000;

async function fetchAppleJwks(): Promise<AppleJwk[]> {
  const now = Date.now();
  if (cachedKeys && now - cachedAt < CACHE_MS) {
    return cachedKeys;
  }
  const res = await fetch(APPLE_JWKS_URL);
  if (!res.ok) {
    throw new Error('Could not fetch Apple signing keys');
  }
  const body = (await res.json()) as { keys?: AppleJwk[] };
  cachedKeys = Array.isArray(body.keys) ? body.keys : [];
  cachedAt = now;
  return cachedKeys;
}

async function getApplePublicKeyPem(kid: string): Promise<string> {
  const keys = await fetchAppleJwks();
  const jwk = keys.find(k => String(k.kid || '') === kid);
  if (!jwk) {
    throw new Error('Apple signing key not found');
  }
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  return key.export({ type: 'spki', format: 'pem' }).toString();
}

export type AppleIdentityClaims = jwt.JwtPayload & {
  sub?: string;
  email?: string;
};

export async function verifyAppleIdentityToken(
  idToken: string,
  bundleId: string,
): Promise<AppleIdentityClaims> {
  const token = String(idToken || '').trim();
  const audience = String(bundleId || '').trim();
  if (!token) {
    throw new Error('Apple identity token is required');
  }
  if (!audience) {
    throw new Error('APPLE_BUNDLE_ID is not configured on the server');
  }

  const decoded = jwt.decode(token, { complete: true });
  const kid = String(decoded?.header?.kid || '').trim();
  if (!kid) {
    throw new Error('Invalid Apple identity token');
  }

  const pem = await getApplePublicKeyPem(kid);
  const payload = jwt.verify(token, pem, {
    algorithms: ['RS256'],
    issuer: APPLE_ISSUER,
    audience,
  }) as AppleIdentityClaims;

  if (!String(payload.sub || '').trim()) {
    throw new Error('Apple profile is incomplete');
  }

  return payload;
}
