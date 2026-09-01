import { Router, type Response, type NextFunction } from 'express';
import { z } from 'zod';

import type { AppConfig } from '../config.js';
import type { CompetencyService } from '../services/competencyService.js';
import { requireAuth, requireUser, type AuthRequest } from '../auth/middleware.js';

const createProofSchema = z.object({
  competencyId: z.number().int().positive(),
  copiedFromProofId: z.number().int().positive().nullable().optional(),
});

const submitInputSchema = z.object({
  userRole: z.string().min(1),
  what: z.string().min(1),
  how: z.string().min(1),
  why: z.string().min(1),
  environment: z.string().min(1),
  subject: z.string().min(1).nullable().optional(),
});

const retrySchema = z.object({
  userFeedback: z.string().min(1).max(255),
});

/**
 * Competency-Routen (dünne Handler): zod-Validierung → Service → Response.
 * Alle Routen erfordern eine gültige Session (requireAuth).
 */
export function competencyRouter(config: AppConfig, competencyService: CompetencyService): Router {
  const router = Router();
  router.use(requireAuth(config), requireUser);

  router.get('/proofs', (req: AuthRequest, res: Response, next: NextFunction) => {
    competencyService
      .listProofs(req.user!.sub)
      .then((proofs) => res.json({ proofs }))
      .catch(next);
  });

  router.post('/proofs', (req: AuthRequest, res: Response, next: NextFunction) => {
    const parsed = createProofSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', issues: parsed.error.issues });
      return;
    }
    competencyService
      .createProof(req.user!.sub, parsed.data)
      .then((proof) => res.status(201).json({ proof }))
      .catch(next);
  });

  router.get('/proofs/:proofId', (req: AuthRequest, res: Response, next: NextFunction) => {
    const proofId = Number.parseInt(req.params.proofId ?? '', 10);
    if (Number.isNaN(proofId)) {
      res.status(400).json({ error: 'Ungültige proofId' });
      return;
    }
    competencyService
      .getProof(req.user!.sub, proofId)
      .then((proof) => res.json({ proof }))
      .catch(next);
  });

  router.post(
    '/proofs/:proofId/input',
    (req: AuthRequest, res: Response, next: NextFunction) => {
      const proofId = Number.parseInt(req.params.proofId ?? '', 10);
      if (Number.isNaN(proofId)) {
        res.status(400).json({ error: 'Ungültige proofId' });
        return;
      }
      const parsed = submitInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Ungültige Eingabe', issues: parsed.error.issues });
        return;
      }
      competencyService
        .submitInput(req.user!.sub, proofId, parsed.data)
        .then((output) =>
          res.status(201).json({
            output,
            failed: output === null,
          }),
        )
        .catch(next);
    },
  );

  router.post(
    '/outputs/:outputId/retry',
    (req: AuthRequest, res: Response, next: NextFunction) => {
      const outputId = Number.parseInt(req.params.outputId ?? '', 10);
      if (Number.isNaN(outputId)) {
        res.status(400).json({ error: 'Ungültige outputId' });
        return;
      }
      const parsed = retrySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Ungültige Eingabe', issues: parsed.error.issues });
        return;
      }
      competencyService
        .retryOutput(req.user!.sub, outputId, parsed.data.userFeedback)
        .then((output) => res.status(201).json({ output }))
        .catch(next);
    },
  );

  router.post(
    '/outputs/:outputId/accept',
    (req: AuthRequest, res: Response, next: NextFunction) => {
      const outputId = Number.parseInt(req.params.outputId ?? '', 10);
      if (Number.isNaN(outputId)) {
        res.status(400).json({ error: 'Ungültige outputId' });
        return;
      }
      competencyService
        .acceptOutput(req.user!.sub, outputId)
        .then((output) => res.json({ output }))
        .catch(next);
    },
  );

  router.delete(
    '/proofs/:proofId',
    (req: AuthRequest, res: Response, next: NextFunction) => {
      const proofId = Number.parseInt(req.params.proofId ?? '', 10);
      if (Number.isNaN(proofId)) {
        res.status(400).json({ error: 'Ungültige proofId' });
        return;
      }
      competencyService
        .discardProof(req.user!.sub, proofId)
        .then((proof) => res.json({ proof }))
        .catch(next);
    },
  );

  return router;
}
