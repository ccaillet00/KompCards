import { parse } from 'csv-parse/sync';
import { eq, inArray } from 'drizzle-orm';

import type { Database } from '../db/client.js';
import { areas, competencies, curriculum } from '../db/schema.js';
import { BadRequestError, ConflictError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface ImportResult {
  curriculum: number;
  areas: number;
  competencies: number;
}

export interface CompetencyTree {
  id: number;
  code: string;
  description: string;
}

export interface AreaTree {
  id: number;
  code: string;
  titel: string;
  competencies: CompetencyTree[];
}

export interface CurriculumTree {
  id: number;
  code: string;
  titel: string;
  areas: AreaTree[];
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
 * Strategie: Neue Lehrpläne ergänzen, bestehende Daten erhalten (ADR-024).
 */
export class CurriculumService {
  constructor(private readonly db: Database) {}

  /**
   * Importiert die drei CSVs (curriculum, areas, competencies).
   *
   * 1. CSVs parsen & validieren
   * 2. Uploadlokale IDs und Elternreferenzen prüfen
   * 3. In einer Transaktion: Code-Konflikte prüfen + einfügen mit ID-Mapping
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

    validateImport(curriculumRows, areaRows, competencyRows);

    const result = await this.db.transaction(async (tx) => {
      // MySQL vergleicht Codes gemäss der bestehenden Datenbank-Kollation.
      const existing = await tx.select({ code: curriculum.code }).from(curriculum)
        .where(inArray(curriculum.code, curriculumRows.map((row) => row.code)));
      if (existing.length > 0) {
        throw curriculumConflict(existing.map((row) => row.code));
      }

      // Einzelne Inserts erlauben bei konkurrierenden Imports eine genaue
      // Konfliktmeldung. Der Unique-Index sichert die Prüfung zusätzlich ab.
      const curriculumIdMap = new Map<number, number>();
      const insertedCurriculumIds = new Set<number>();
      for (const row of curriculumRows) {
        try {
          const [inserted] = await tx.insert(curriculum)
            .values([{ code: row.code, titel: row.titel }]).$returningId();
          curriculumIdMap.set(row.id, inserted!.id);
          insertedCurriculumIds.add(inserted!.id);
        } catch (err) {
          if (isDuplicateEntry(err)) {
            // Gleichwertige Codes (z. B. Gross-/Kleinschreibung) im Upload
            // erkennt der bestehende DB-Index, ohne die Kollation in JS nachzubauen.
            const matching = await tx.select({ id: curriculum.id }).from(curriculum)
              .where(eq(curriculum.code, row.code));
            if (matching.some((match) => insertedCurriculumIds.has(match.id))) {
              throw new BadRequestError(`Lehrplancode "${row.code}" entspricht einem anderen Code in curriculum.csv`);
            }
            throw curriculumConflict([row.code]);
          }
          throw err;
        }
      }

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

  /**
   * Liefert alle Lehrgänge mit ihren Bereichen und Kompetenzen als verschachtelte Struktur.
   *
   * Drei separate SELECTs (kleine Referenzdaten) + In-Memory-Nesting via Maps.
   * Skaliert linear mit der Anzahl Lehrgänge — pro Lehrgang bleibt die Datenmenge konstant.
   */
  async getCurriculumTree(): Promise<CurriculumTree[]> {
    const [curriculumRows, areaRows, competencyRows] = await Promise.all([
      this.db.select().from(curriculum),
      this.db.select().from(areas),
      this.db.select().from(competencies),
    ]);

    // Kompetenzen nach areaId gruppieren
    const competenciesByArea = new Map<number, CompetencyTree[]>();
    for (const c of competencyRows) {
      const list = competenciesByArea.get(c.areaId) ?? [];
      list.push({ id: c.id, code: c.code, description: c.description });
      competenciesByArea.set(c.areaId, list);
    }

    // Bereiche nach curriculumId gruppieren
    const areasByCurriculum = new Map<number, AreaTree[]>();
    for (const a of areaRows) {
      const list = areasByCurriculum.get(a.curriculumId) ?? [];
      list.push({
        id: a.id,
        code: a.code,
        titel: a.titel,
        competencies: competenciesByArea.get(a.id) ?? [],
      });
      areasByCurriculum.set(a.curriculumId, list);
    }

    // Verschachteln
    return curriculumRows.map((c) => ({
      id: c.id,
      code: c.code,
      titel: c.titel,
      areas: areasByCurriculum.get(c.id) ?? [],
    }));
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
  const n = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(n) || n < 1 || n > 4294967295) {
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
    validateFieldLengths(code, titel, 'curriculum', i + 2);
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
    validateFieldLengths(code, titel, 'areas', i + 2);
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
    validateFieldLengths(code, description, 'competencies', i + 2);
    return { id, areaId, code, description };
  });
}

/** VARCHAR(10) zählt Zeichen, TEXT erlaubt höchstens 65535 UTF-8-Bytes. */
function validateFieldLengths(code: string, text: string, name: string, row: number): void {
  if ([...code].length > 10) {
    throw new BadRequestError(`Zeile ${row}: "code" darf höchstens 10 Zeichen enthalten (${name}.csv)`);
  }
  if (Buffer.byteLength(text, 'utf8') > 65535) {
    throw new BadRequestError(`Zeile ${row}: Text überschreitet 65535 UTF-8-Bytes (${name}.csv)`);
  }
}

function validateImport(plans: CurriculumRow[], sections: AreaRow[], skills: CompetencyRow[]): void {
  function unique<T>(rows: T[], key: (row: T) => string | number, name: string): void {
    const seen = new Set<string | number>();
    for (const row of rows) {
      const value = key(row);
      if (seen.has(value)) throw new BadRequestError(`Doppelter Wert "${value}" für ${name}`);
      seen.add(value);
    }
  }
  unique(plans, (row) => row.id, 'id in curriculum.csv');
  unique(sections, (row) => row.id, 'id in areas.csv');
  unique(skills, (row) => row.id, 'id in competencies.csv');
  unique(plans, (row) => row.code, 'code in curriculum.csv');

  const planIds = new Set(plans.map((row) => row.id));
  const areaIds = new Set(sections.map((row) => row.id));
  sections.forEach((row, i) => {
    if (!planIds.has(row.curriculumId)) {
      throw new BadRequestError(`Zeile ${i + 2}: curriculum_id "${row.curriculumId}" fehlt in curriculum.csv`);
    }
  });
  skills.forEach((row, i) => {
    if (!areaIds.has(row.areaId)) {
      throw new BadRequestError(`Zeile ${i + 2}: area_id "${row.areaId}" fehlt in areas.csv`);
    }
  });
}

function curriculumConflict(codes: string[]): ConflictError {
  return new ConflictError(`Import abgelehnt: Rahmenlehrplancode bereits vorhanden: ${codes.join(', ')}. Es wurden keine Daten importiert.`);
}

/** Drizzle umschliesst MySQL-Fehler als cause; nur Duplicate-Entry übersetzen. */
function isDuplicateEntry(err: unknown): boolean {
  const visited = new Set<unknown>();
  while (err && typeof err === 'object' && !visited.has(err)) {
    visited.add(err);
    if ('code' in err && err.code === 'ER_DUP_ENTRY') return true;
    err = 'cause' in err ? err.cause : undefined;
  }
  return false;
}
