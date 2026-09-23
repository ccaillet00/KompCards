import {
  Router,
  type CookieOptions,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { z } from 'zod';

import type { AppConfig } from '../config.js';
import type { AuthService } from '../services/authService.js';
import { requireAuth, type AuthRequest } from '../auth/middleware.js';

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const AUTH_COOKIE = 'access_token';

function authCookieOptions(config: AppConfig, maxAge?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}

/**
 * Auth-Routen (dünne Handler): zod-Validierung → Service → Response.
 * Kein DB-Zugriff hier (ADR-005).
 */
export function authRouter(config: AppConfig, authService: AuthService): Router {
  const router = Router();

  router.post('/register', (req: Request, res: Response, next: NextFunction) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', issues: parsed.error.issues });
      return;
    }
    authService
      .register(parsed.data)
      .then((user) => res.status(201).json({ user }))
      .catch(next);
  });

  router.post('/login', (req: Request, res: Response, next: NextFunction) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', issues: parsed.error.issues });
      return;
    }
    authService
      .login(parsed.data)
      .then((result) => {
        res.cookie(AUTH_COOKIE, result.token, authCookieOptions(config, result.expiresInSeconds * 1000));
        res.json({ user: result.user, expiresInSeconds: result.expiresInSeconds });
      })
      .catch(next);
  });

  router.get('/me', requireAuth(config), (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new Error('Authentifizierter Nutzer fehlt'));
      return;
    }
    authService
      .getUserById(req.user.sub)
      .then((user) => res.json({ user, expiresAt: req.user!.exp * 1000 }))
      .catch(next);
  });

  router.post('/logout', requireAuth(config), (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.cookies?.[AUTH_COOKIE];
    if (!token) {
      res.status(204).clearCookie(AUTH_COOKIE, authCookieOptions(config)).send();
      return;
    }
    authService
      .logout(token)
      .then(() => res.status(204)
        .clearCookie(AUTH_COOKIE, authCookieOptions(config))
        .send())
      .catch(next);
  });

  return router;
}
