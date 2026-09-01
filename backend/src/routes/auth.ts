import { Router, type Request, type Response, type NextFunction } from 'express';
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
      .then((result) => res.json(result))
      .catch(next);
  });

  router.post('/logout', requireAuth(config), (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    authService
      .logout(token)
      .then(() => res.status(204).send())
      .catch(next);
  });

  return router;
}
