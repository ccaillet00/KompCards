import multer from 'multer';
import { Router, type NextFunction, type Response } from 'express';

import type { AppConfig } from '../config.js';
import { requireAuth, requireUser, type AuthRequest } from '../auth/middleware.js';
import { BadRequestError } from '../utils/errors.js';
import type { CurriculumService } from '../services/curriculumService.js';

/** Multer-Upload: 3 Felder (curriculum, areas, competencies), max. 5 MB pro Datei. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * Curriculum-Routen: Import der Rahmenlehrplan-Referenzdaten aus CSV-Dateien.
 *
 * `POST /import` — multipart-Upload mit 3 Dateien (curriculum, areas, competencies).
 * Erfordert eine gültige Session (requireAuth).
 */
export function curriculumRouter(config: AppConfig, curriculumService: CurriculumService): Router {
  const router = Router();
  router.use(requireAuth(config), requireUser);

  router.post(
    '/import',
    upload.fields([
      { name: 'curriculum', maxCount: 1 },
      { name: 'areas', maxCount: 1 },
      { name: 'competencies', maxCount: 1 },
    ]),
    (req: AuthRequest, res: Response, next: NextFunction) => {
      // multer.fields() setzt req.files als Objekt: { curriculum: [File], areas: [File], ... }
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;

      const curriculumFile = files?.curriculum?.[0];
      const areasFile = files?.areas?.[0];
      const competenciesFile = files?.competencies?.[0];

      if (!curriculumFile || !areasFile || !competenciesFile) {
        throw new BadRequestError(
          'Alle drei Dateien erforderlich: curriculum, areas, competencies',
        );
      }

      const curriculumCsv = curriculumFile.buffer.toString('utf-8');
      const areasCsv = areasFile.buffer.toString('utf-8');
      const competenciesCsv = competenciesFile.buffer.toString('utf-8');

      curriculumService
        .importCurriculum(curriculumCsv, areasCsv, competenciesCsv)
        .then((result) => res.json({ imported: result }))
        .catch(next);
    },
  );

  return router;
}
