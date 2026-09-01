import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';

import type { AppConfig } from './config.js';
import { authRouter } from './routes/auth.js';
import { competencyRouter } from './routes/competency.js';
import type { AuthService } from './services/authService.js';
import type { CompetencyService } from './services/competencyService.js';
import { AppError } from './utils/errors.js';
import { logger } from './utils/logger.js';

/**
 * Baut die Express-App.
 *
 * Services werden injiziert (Dependency Injection) — so können Tests die App
 * mit gemockten Services/DB/LLM aufbauen, ohne echte Abhängigkeiten.
 */
export function createApp(
  config: AppConfig,
  services: {
    auth: AuthService;
    competency: CompetencyService;
  },
): Express {
  const app = express();

  app.use(express.json());

  // Health-Check (für Traefik / Monitoring)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // API-Routen (Traefik leitet /api an dieses Backend weiter)
  app.use('/api/auth', authRouter(config, services.auth));
  app.use('/api/competency', competencyRouter(config, services.competency));

  // 404 für unbekannte API-Pfade
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Nicht gefunden' });
  });

  // Zentraler Error-Handler
  app.use(errorHandler);

  return app;
}

/** Übersetzt Fehler in konsistente JSON-Responses. */
function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Ungültige Eingabe', issues: err.issues });
    return;
  }

  logger.error({ err }, 'Unerwarteter Fehler');
  res.status(500).json({ error: 'Interner Serverfehler' });
}
