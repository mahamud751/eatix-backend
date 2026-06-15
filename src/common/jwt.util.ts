import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export const DEFAULT_JWT_EXPIRES_IN = '365d';

export function getJwtExpiresIn(configService: ConfigService): string {
  return (
    configService.get<string>('JWT_EXPIRES_IN')?.trim() || DEFAULT_JWT_EXPIRES_IN
  );
}

export function signUserAuthToken(
  user: { id: string; email: string },
  secret: string,
  expiresIn: string,
): string {
  return jwt.sign({ userId: user.id, email: user.email }, secret, { expiresIn });
}

export function verifyAuthTokenIgnoreExpiry(
  token: string,
  secret: string,
): jwt.JwtPayload {
  return jwt.verify(token, secret, {
    ignoreExpiration: true,
  }) as jwt.JwtPayload;
}
