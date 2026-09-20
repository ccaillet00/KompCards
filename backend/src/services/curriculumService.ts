import { parse } from 'csv-parse/sync';

import type { Database } from '../db/client.js';
import { areas, competencies, competencyProof, curriculum } from '../db/schema.js';
import { BadRequestError, ConflictError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface ImportResult {
  curriculum: number;
  areas: number;
  competencies: number;
}

interface CurriculumRow {
  id: number;
  code: string;
  titel: string;
}

interface AreaRow {
  id: number;
  curriculumId: number;
  code: string;
  titel: string;
}

interface CompetencyRow {
  id: number;
  areaId: number;
  code: string;
  description: string;
}

/**
 * Curriculum-Service: Import der Rahmenlehrplan-Referenzdaten
 * (curriculum, areas, competencies) aus CSV-Dateien.
 *
 * Business Logic **und** Drizzle-Queries (ADR-005).
 * Strategie: Löschen & Neu (komplett), in einer Transaktion.
 */
export class CurriculumService {
  constructor(private readonly db: Database) {}

  /**
   * Importiert die drei CSVs (curriculum, areas, competencies).
   *
   * 1. CSVs parsen & validieren
   * 2. FK-Check: keine bestehenden competency_proof-Zeilen
   * 3. In einer Transaktion: löschen (children first) + einfügen mit ID-Mapping
   */
  async importCurriculum(
    curriculumCsv: string,
    areasCsv: string,
    competenciesCsv: string,
  ): Promise<ImportResult> {
    // 1. Parse & validate
    const curriculumRows = parseCurriculumCsv(curriculumCsv);
    const areaRows = parseAreasCsv(areasCsv);
    const competencyRows = parseCompetenciesCsv(competenciesCsv);

    // 2. FK-Check: competency_proof verweist auf competencies (NO ACTION)
    const existingProofs = await this.db
      .select({ id: competencyProof.id })
      .from(competencyProof)
      .limit(1);
    if (existingProofs.length > 0) {
      throw new ConflictError(
        'Import nicht möglich: Es existieren bereits Kompetenznachweise, die auf die Referenzdaten verweisen.',
      );
    }

    // 3. Delete + Insert in einer Transaktion
    const result = await this.db.transaction(async (tx) => {
      // Löschen in korrekter Reihenfolge (children first wegen FKs)
      await tx.delete(competencies);
      await tx.delete(areas);
      await tx.delete(curriculum);

      // Curriculum einfügen → ID-Mapping: CSV id → neue DB id
      const curriculumResults = await tx
        .insert(curriculum)
        .values(curriculumRows.map((r) => ({ code: r.code, titel: r.titel })))
        .$returningId();
      const curriculumIdMap = new Map<number, number>();
      curriculumRows.forEach((row, i) => {
        const result = curriculumResults[i];
        if (result) {
          curriculumIdMap.set(row.id, result.id);
        }
      });

      // Areas einfügen (curriculum_id mappen) → ID-Mapping
      const areaResults = await tx
        .insert(areas)
        .values(
          areaRows.map((r) => ({
            curriculumId: curriculumIdMap.get(r.curriculumId)!,
            code: r.code,
            titel: r.titel,
          })),
        )
        .$returningId();
      const areaIdMap = new Map<number, number>();
      areaRows.forEach((row, i) => {
        const result = areaResults[i];
        if (result) {
          areaIdMap.set(row.id, result.id);
        }
      });

      // Competencies einfügen (area_id mappen)
      await tx
        .insert(competencies)
        .values(
          competencyRows.map((r) => ({
            areaId: areaIdMap.get(r.areaId)!,
            code: r.code,
            description: r.description,
          })),
        );

      return {
        curriculum: curriculumRows.length,
        areas: areaRows.length,
        competencies: competencyRows.length,
      };
    });

    logger.info({ ...result }, 'Rahmenlehrplan-Import abgeschlossen');
    return result;
  }
}

// ─── CSV-Parsing & Validierung (reine Funktionen, ohne DB) ───────────────────

function parseCsv(raw: string, name: string): Record<string, string>[] {
  const cleaned = raw.replace(/^\uFEFF/, '');

  let records: Record<string, string>[];
  try {
    records = parse(cleaned, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    throw new BadRequestError(
      `CSV-Parsing fehlgeschlagen (${name}.csv): ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (records.length === 0) {
    throw new BadRequestError(`CSV ist leer (${name}.csv)`);
  }

  return records;
}

function validateColumns(records: Record<string, string>[], expected: string[], name: string): void {
  const first = records[0];
  if (!first) {
    throw new BadRequestError(`CSV ist leer (${name}.csv)`);
  }
  const actual = Object.keys(first);
  for (const col of expected) {
    if (!actual.includes(col)) {
      throw new BadRequestError(`Fehlende Spalte "${col}" in ${name}.csv`);
    }
  }
}

function parseInt(value: string, field: string, name: string, row: number): number {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) {
    throw new BadRequestError(`Zeile ${row}: ungültiger Wert "${value}" für "${field}" in ${name}.csv`);
  }
  return n;
}

export function parseCurriculumCsv(raw: string): CurriculumRow[] {
  const records = parseCsv(raw, 'curriculum');
  validateColumns(records, ['id', 'code', 'titel'], 'curriculum');

  return records.map((r, i) => {
    const id = parseInt(r.id ?? '', 'id', 'curriculum', i + 2);
    const code = r.code ?? '';
    const titel = r.titel ?? '';
    if (!code || !titel) {
      throw new BadRequestError(`Zeile ${i + 2}: fehlender Wert für "code" oder "titel" in curriculum.csv`);
    }
    return { id, code, titel };
  });
}

export function parseAreasCsv(raw: string): AreaRow[] {
  const records = parseCsv(raw, 'areas');
  validateColumns(records, ['id', 'curriculum_id', 'code', 'titel'], 'areas');

  return records.map((r, i) => {
    const id = parseInt(r.id ?? '', 'id', 'areas', i + 2);
    const curriculumId = parseInt(r.curriculum_id ?? '', 'curriculum_id', 'areas', i + 2);
    const code = r.code ?? '';
    const titel = r.titel ?? '';
    if (!code || !titel) {
      throw new BadRequestError(`Zeile ${i + 2}: fehlender Wert für "code" oder "titel" in areas.csv`);
    }
    return { id, curriculumId, code, titel };
  });
}

export function parseCompetenciesCsv(raw: string): CompetencyRow[] {
  const records = parseCsv(raw, 'competencies');
  validateColumns(records, ['id', 'area_id', 'code', 'description'], 'competencies');

  return records.map((r, i) => {
    const id = parseInt(r.id ?? '', 'id', 'competencies', i + 2);
    const areaId = parseInt(r.area_id ?? '', 'area_id', 'competencies', i + 2);
    const code = r.code ?? '';
    const description = r.description ?? '';
    if (!code || !description) {
      throw new BadRequestError(`Zeile ${i + 2}: fehlender Wert für "code" oder "description" in competencies.csv`);
    }
    return { id, areaId, code, description };
  });
}
