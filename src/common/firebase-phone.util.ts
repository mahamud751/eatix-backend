import { BadRequestException } from '@nestjs/common';

type FirebaseLookupResponse = {
  users?: Array<{
    localId?: string;
    phoneNumber?: string;
    email?: string;
  }>;
};

/** Verify Firebase phone-auth ID token via Identity Toolkit REST API. */
export async function verifyFirebasePhoneIdToken(
  idToken: string,
  apiKey: string,
): Promise<{ uid: string; phone: string }> {
  const key = String(apiKey || '').trim();
  if (!key) {
    throw new BadRequestException(
      'Phone login is not configured (FIREBASE_WEB_API_KEY missing on server)',
    );
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: String(idToken || '').trim() }),
    },
  );

  const data = (await res.json().catch(() => ({}))) as FirebaseLookupResponse & {
    error?: { message?: string };
  };

  if (!res.ok) {
    const msg =
      data?.error?.message || 'Invalid or expired phone verification token';
    throw new BadRequestException(msg);
  }

  const user = data.users?.[0];
  if (!user?.localId || !user?.phoneNumber) {
    throw new BadRequestException('Phone number not verified with Firebase');
  }

  return {
    uid: user.localId,
    phone: user.phoneNumber,
  };
}

export function normalizePhoneE164(phone: string): string {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  if (raw.startsWith('+')) return raw.replace(/\s/g, '');
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('44')) return `+${digits}`;
  if (digits.startsWith('0')) return `+44${digits.slice(1)}`;
  return `+${digits}`;
}

export function phoneToSyntheticEmail(phone: string): string {
  const normalized = normalizePhoneE164(phone).replace(/\+/g, '');
  return `phone_${normalized}@phone.eatix.app`;
}
