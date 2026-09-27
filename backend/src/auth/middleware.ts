import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';

import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role?: string | null;
}

export interface AuthenticatedSession {
  user: AuthenticatedUser;
  session: { id: string };
}

export interface SessionReader {
  getSession(input: { headers: Headers }): Promise<AuthenticatedSession | null>;
}

/** Express request enriched with the stable Better Auth user identity. */
export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  authSession?: AuthenticatedSession['session'];
}

/** Validates the database-backed Better Auth session from the incoming cookie. */
export function requireAuth(auth: SessionReader) {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await auth.getSession({ headers: fromNodeHeaders(req.headers) });
      if (!result?.user) {
        throw new UnauthorizedError('Sitzung ungültig oder abgelaufen. Bitte erneut anmelden.');
      }

      req.user = result.user;
      req.authSession = result.session;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireUser(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }
  next();
}

/** Restricts an application route to an explicitly assigned admin role. */
export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction): void {
  const roles = req.user?.role?.split(',').map(role => role.trim()) ?? [];
  if (!roles.includes('admin')) {
    next(new ForbiddenError('Admin-Berechtigung erforderlich'));
    return;
  }
  next();
}
