import { describe, expect, it, vi, type Mock } from 'vitest';

import {
  CurriculumService,
  parseAreasCsv,
  parseCompetenciesCsv,
  parseCurriculumCsv,
} from '../src/services/curriculumService.js';
import { areas, competencies, curriculum } from '../src/db/schema.js';
import { BadRequestError, ConflictError } from '../src/utils/errors.js';

// ─── CSV-Parsing (reine Funktionen) ──────────────────────────────────────────

const validCurriculum = `id,code,titel
1,RLP_Informatik,Rahmenlehrplan Informatik
`;

const validAreas = `id,curriculum_id,code,titel
1,1,A1,Unternehmensprozesse
2,1,A2,Kommunikation
`;

const validCompetencies = `id,area_id,code,description
1,1,A1.1,Geschäftsprozesse ausführen
2,2,A2.1,Kommunizieren
`;

describe('parseCurriculumCsv', () => {
  it('parst ein valides CSV', () => {
    const rows = parseCurriculumCsv(validCurriculum);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ id: 1, code: 'RLP_Informatik', titel: 'Rahmenlehrplan Informatik' });
  });

  it('wirft bei fehlender Spalte', () => {
    expect(() => parseCurriculumCsv('id,name,titel\n1,x,y\n')).toThrow(BadRequestError);
  });

  it('wirft bei leerem CSV', () => {
    expect(() => parseCurriculumCsv('id,code,titel\n')).toThrow(BadRequestError);
  });

  it('wirft bei ungültiger ID', () => {
    expect(() => parseCurriculumCsv('id,code,titel\nabc,x,y\n')).toThrow(BadRequestError);
  });

  it('wirft bei fehlendem code', () => {
    expect(() => parseCurriculumCsv('id,code,titel\n1,,y\n')).toThrow(BadRequestError);
  });

  it('entfernt BOM', () => {
    const rows = parseCurriculumCsv(`\uFEFFid,code,titel
1,RLP,test
`);
    expect(rows[0]?.code).toBe('RLP');
  });
});

describe('parseAreasCsv', () => {
  it('parst ein valides CSV', () => {
    const rows = parseAreasCsv(validAreas);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ id: 1, curriculumId: 1, code: 'A1', titel: 'Unternehmensprozesse' });
    expect(rows[1]).toEqual({ id: 2, curriculumId: 1, code: 'A2', titel: 'Kommunikation' });
  });

  it('wirft bei fehlender Spalte', () => {
    expect(() => parseAreasCsv('id,curriculum_id,name,titel\n1,1,x,y\n')).toThrow(BadRequestError);
  });

  it('wirft bei ungültiger curriculum_id', () => {
    expect(() => parseAreasCsv('id,curriculum_id,code,titel\n1,abc,x,y\n')).toThrow(BadRequestError);
  });
});

describe('parseCompetenciesCsv', () => {
  it('parst ein valides CSV', () => {
    const rows = parseCompetenciesCsv(validCompetencies);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ id: 1, areaId: 1, code: 'A1.1', description: 'Geschäftsprozesse ausführen' });
  });

  it('wirft bei fehlender Spalte', () => {
    expect(() => parseCompetenciesCsv('id,area_id,code,text\n1,1,x,y\n')).toThrow(BadRequestError);
  });

  it('wirft bei fehlender description', () => {
    expect(() => parseCompetenciesCsv('id,area_id,code,description\n1,1,x,\n')).toThrow(BadRequestError);
  });
});

// ─── importCurriculum (mit gemockter DB) ─────────────────────────────────────

function createMockDb() {
  const deleteCalls: unknown[] = [];

  const txMock = {
    insert: vi.fn(() => ({
      values: vi.fn((vals: unknown[]) => ({
        $returningId: vi.fn(async () =>
          vals.map((_, i) => ({ id: i + 1 })),
        ),
      })),
    })),
    delete: vi.fn(async (table: unknown) => {
      deleteCalls.push(table);
    }),
  };

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        limit: vi.fn(async () => []),
      })),
    })),
    transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
    _deleteCalls: deleteCalls,
  };

  return db;
}

describe('CurriculumService.importCurriculum', () => {
  it('importiert valide CSVs und gibt Zählung zurück', async () => {
    const db = createMockDb();
    const service = new CurriculumService(db as never);

    const result = await service.importCurriculum(validCurriculum, validAreas, validCompetencies);

    expect(result).toEqual({ curriculum: 1, areas: 2, competencies: 2 });
  });

  it('löscht in korrekter Reihenfolge (competencies → areas → curriculum)', async () => {
    const db = createMockDb();
    const service = new CurriculumService(db as never);

    await service.importCurriculum(validCurriculum, validAreas, validCompetencies);

    expect(db._deleteCalls).toEqual([competencies, areas, curriculum]);
  });

  it('wirft ConflictError wenn competency_proof existiert', async () => {
    const db = createMockDb();
    // Simuliere eine bestehende competency_proof-Zeile
    (db.select as Mock).mockReturnValue({
      from: () => ({
        limit: async () => [{ id: 1 }],
      }),
    });
    const service = new CurriculumService(db as never);

    await expect(
      service.importCurriculum(validCurriculum, validAreas, validCompetencies),
    ).rejects.toThrow(ConflictError);
  });

  it('wirft BadRequestError bei ungültigem CSV', async () => {
    const db = createMockDb();
    const service = new CurriculumService(db as never);

    await expect(
      service.importCurriculum('invalid,columns\n1,2\n', validAreas, validCompetencies),
    ).rejects.toThrow(BadRequestError);
  });
});

// ─── getCurriculumTree (mit gemockter DB) ────────────────────────────────────

function createTreeMockDb(
  curriculumRows: { id: number; code: string; titel: string }[],
  areaRows: { id: number; curriculumId: number; code: string; titel: string }[],
  competencyRows: { id: number; areaId: number; code: string; description: string }[],
) {
  const db = {
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => {
        if (table === curriculum) return Promise.resolve(curriculumRows);
        if (table === areas) return Promise.resolve(areaRows);
        if (table === competencies) return Promise.resolve(competencyRows);
        return Promise.resolve([]);
      }),
    })),
  };
  return db;
}

describe('CurriculumService.getCurriculumTree', () => {
  it('gibt leeres Array zurück wenn keine Daten vorhanden', async () => {
    const db = createTreeMockDb([], [], []);
    const service = new CurriculumService(db as never);

    const result = await service.getCurriculumTree();
    expect(result).toEqual([]);
  });

  it('gibt einen Lehrgang mit Bereichen und Kompetenzen zurück', async () => {
    const db = createTreeMockDb(
      [{ id: 1, code: 'RLP_INF', titel: 'Rahmenlehrplan Informatik' }],
      [
        { id: 1, curriculumId: 1, code: 'A1', titel: 'Unternehmensprozesse' },
        { id: 2, curriculumId: 1, code: 'A2', titel: 'Kommunikation' },
      ],
      [
        { id: 1, areaId: 1, code: 'A1.1', description: 'Geschäftsprozesse ausführen' },
        { id: 2, areaId: 2, code: 'A2.1', description: 'Kommunizieren' },
      ],
    );
    const service = new CurriculumService(db as never);

    const result = await service.getCurriculumTree();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 1,
      code: 'RLP_INF',
      titel: 'Rahmenlehrplan Informatik',
      areas: [
        {
          id: 1,
          code: 'A1',
          titel: 'Unternehmensprozesse',
          competencies: [{ id: 1, code: 'A1.1', description: 'Geschäftsprozesse ausführen' }],
        },
        {
          id: 2,
          code: 'A2',
          titel: 'Kommunikation',
          competencies: [{ id: 2, code: 'A2.1', description: 'Kommunizieren' }],
        },
      ],
    });
  });

  it('gibt mehrere Lehrgänge zurück', async () => {
    const db = createTreeMockDb(
      [
        { id: 1, code: 'RLP_INF', titel: 'Rahmenlehrplan Informatik' },
        { id: 2, code: 'RLP_WIRTSCH', titel: 'Rahmenlehrplan Wirtschaft' },
      ],
      [
        { id: 1, curriculumId: 1, code: 'A1', titel: 'Unternehmensprozesse' },
        { id: 2, curriculumId: 2, code: 'B1', titel: 'Buchhaltung' },
      ],
      [
        { id: 1, areaId: 1, code: 'A1.1', description: 'Geschäftsprozesse ausführen' },
        { id: 2, areaId: 2, code: 'B1.1', description: 'Bilanz erstellen' },
      ],
    );
    const service = new CurriculumService(db as never);

    const result = await service.getCurriculumTree();

    expect(result).toHaveLength(2);
    expect(result[0]?.code).toBe('RLP_INF');
    expect(result[0]?.areas).toHaveLength(1);
    expect(result[1]?.code).toBe('RLP_WIRTSCH');
    expect(result[1]?.areas).toHaveLength(1);
  });

  it('ordnet Kompetenzen korrekt dem Bereich zu', async () => {
    const db = createTreeMockDb(
      [{ id: 1, code: 'RLP_INF', titel: 'Rahmenlehrplan Informatik' }],
      [
        { id: 1, curriculumId: 1, code: 'A1', titel: 'Unternehmensprozesse' },
        { id: 2, curriculumId: 1, code: 'A2', titel: 'Kommunikation' },
      ],
      [
        { id: 1, areaId: 1, code: 'A1.1', description: 'Prozess 1' },
        { id: 2, areaId: 1, code: 'A1.2', description: 'Prozess 2' },
        { id: 3, areaId: 2, code: 'A2.1', description: 'Komm 1' },
      ],
    );
    const service = new CurriculumService(db as never);

    const result = await service.getCurriculumTree();

    expect(result[0]?.areas[0]?.competencies).toHaveLength(2);
    expect(result[0]?.areas[1]?.competencies).toHaveLength(1);
  });

  it('gibt Bereiche ohne Kompetenzen mit leerem Array zurück', async () => {
    const db = createTreeMockDb(
      [{ id: 1, code: 'RLP_INF', titel: 'Rahmenlehrplan Informatik' }],
      [{ id: 1, curriculumId: 1, code: 'A1', titel: 'Leerer Bereich' }],
      [],
    );
    const service = new CurriculumService(db as never);

    const result = await service.getCurriculumTree();

    expect(result[0]?.areas[0]?.competencies).toEqual([]);
  });
});
