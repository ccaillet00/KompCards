import { createHash } from 'node:crypto';

import jwt from 'jsonwebtoken';

import type { AppConfig } from '../config.js';

/** Payload eines KompCards-JWT. */
export interface JwtPayload {
  /** `userTable.id` (UUID). */
  sub: string;
  /** `userTable.email`. */
  email: string;
  /** Unix-Zeitstempel (Sekunden), zu dem das Token ausläuft. */
  exp: number;
  /** Unix-Zeitstempel (Sekunden), zu dem das Token ausgestellt wurde. */
  iat: number;
}

/**
 * Erzeugt ein signiertes JWT für einen Nutzer.
 * Ein JWT pro Login (ADR-002).
 */
export function signToken(
  config: Pick<AppConfig, 'jwtSecret' | 'jwtTtlSeconds'>,
  user: { id: string; email: string },
): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { sub: user.id, email: user.email, iat: now, exp: now + config.jwtTtlSeconds },
    config.jwtSecret,
    { algorithm: 'HS256' },
  );
}

/**
 * Prüft Signatur und Ablaufzeit eines JWT.
 * @throws `jwt.JsonWebTokenError` / `jwt.TokenExpiredError` bei ungültigem Token.
 */
export function verifyToken(
  config: Pick<AppConfig, 'jwtSecret'>,
  token: string,
): JwtPayload {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as JwtPayload;
}

/**
 * Deterministischer Hash eines JWT (SHA-256, hex).
 * Wird in `userSession.token_hash` gespeichert — das JWT selbst nie im Klartext.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
