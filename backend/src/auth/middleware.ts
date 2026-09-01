import type { NextFunction, Request, Response } from 'express';

import type { AppConfig } from '../config.js';
import { getDb } from '../db/client.js';
import { userSession } from '../db/schema.js';
import { eq } from 'drizzle-orm';

import { UnauthorizedError } from '../utils/errors.js';
import { hashToken, verifyToken, type JwtPayload } from './jwt.js';

/** Erweitert den Express-Request um den authentifizierten Nutzer. */
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * Middleware: prüft das JWT (Signatur + Zeit) und die serverseitige Session
 * (Hash-Lookup, nicht revoked, nicht abgelaufen). Andernfalls 401.
 *
 * Flow (ADR-002):
 * 1. JWT signatur-/zeitmäßig prüfen.
 * 2. Hash(JWT) in `userSession` suchen.
 * 3. Prüfung: nicht revoked, `expires_at` > now.
 */
export function requireAuth(config: AppConfig) {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const header = req.headers.authorization;
      if (!header || !header.startsWith('Bearer ')) {
        throw new UnauthorizedError('Fehlendes Bearer-Token');
      }
      const token = header.slice('Bearer '.length).trim();

      // 1. JWT signatur-/zeitmäßig prüfen
      const payload = verifyToken(config, token);

      // 2. + 3. serverseitige Session prüfen
      const db = getDb();
      const rows = await db
        .select()
        .from(userSession)
        .where(eq(userSession.tokenHash, hashToken(token)))
        .limit(1);

      const session = rows[0];
      if (!session) {
        throw new UnauthorizedError('Unbekannte Session');
      }
      if (session.revokedAt !== null) {
        throw new UnauthorizedError('Session wurde widerrufen');
      }
      if (new Date(session.expiresAt).getTime() <= Date.now()) {
        throw new UnauthorizedError('Session abgelaufen');
      }

      req.user = payload;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware: setzt `req.user` voraus (nach `requireAuth`).
 * Wirft 401, falls kein Nutzer gesetzt ist.
 */
export function requireUser(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }
  next();
}
