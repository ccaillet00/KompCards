import { describe, expect, it, vi } from 'vitest';

import {
  CurriculumService,
  parseAreasCsv,
  parseCompetenciesCsv,
  parseCurriculumCsv,
} from '../src/services/curriculumService.js';
import { areas, competencies, competencyProof, curriculum } from '../src/db/schema.js';
import { BadRequestError, ConflictError } from '../src/utils/errors.js';

// ─── CSV-Parsing (reine Funktionen) ──────────────────────────────────────────

const validCurriculum = `id,code,titel
1,RLP_INF,Rahmenlehrplan Informatik
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
    expect(rows[0]).toEqual({ id: 1, code: 'RLP_INF', titel: 'Rahmenlehrplan Informatik' });
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

describe('CSV-Feldvalidierung', () => {
  const parsers = [
    { name: 'curriculum', parse: parseCurriculumCsv, header: 'id,code,titel', row: ['1', 'RLP', 'Titel'], idIndexes: [0], codeIndex: 1, textIndex: 2 },
    { name: 'areas', parse: parseAreasCsv, header: 'id,curriculum_id,code,titel', row: ['1', '1', 'A1', 'Titel'], idIndexes: [0, 1], codeIndex: 2, textIndex: 3 },
    { name: 'competencies', parse: parseCompetenciesCsv, header: 'id,area_id,code,description', row: ['1', '1', 'A1.1', 'Text'], idIndexes: [0, 1], codeIndex: 2, textIndex: 3 },
  ];

  for (const parser of parsers) {
    for (const index of parser.idIndexes) {
      it.each(['0', '-1', '1abc', '1.5', '1e2', '9007199254740993', '4294967296'])(
        `${parser.name}: weist ungültige ID %s in Spalte ${index + 1} zurück`,
        (invalidId) => {
          const row = [...parser.row];
          row[index] = invalidId;
          expect(() => parser.parse(`${parser.header}\n${row.join(',')}\n`)).toThrow(BadRequestError);
        },
      );
    }

    it(`${parser.name}: erlaubt Codes mit zehn Zeichen und Text an der UTF-8-Bytegrenze`, () => {
      const row = [...parser.row];
      row[parser.codeIndex] = 'A'.repeat(10);
      row[parser.textIndex] = 'ä'.repeat(32767) + 'a';
      expect(parser.parse(`${parser.header}\n${row.join(',')}\n`)).toHaveLength(1);
    });

    it(`${parser.name}: zählt zehn Unicode-Codepoints statt UTF-16-Einheiten`, () => {
      const row = [...parser.row];
      row[parser.codeIndex] = '🦊'.repeat(10);
      expect(parser.parse(`${parser.header}\n${row.join(',')}\n`)).toHaveLength(1);
    });

    it(`${parser.name}: weist zu lange Codes zurück`, () => {
      const row = [...parser.row];
      row[parser.codeIndex] = 'A'.repeat(11);
      expect(() => parser.parse(`${parser.header}\n${row.join(',')}\n`)).toThrow(BadRequestError);
    });

    it(`${parser.name}: weist Text über 65535 UTF-8-Bytes zurück`, () => {
      const row = [...parser.row];
      row[parser.textIndex] = 'ä'.repeat(32768);
      expect(() => parser.parse(`${parser.header}\n${row.join(',')}\n`)).toThrow(BadRequestError);
    });
  }
});

// ─── importCurriculum (mit gemockter DB) ─────────────────────────────────────

type StoredRow = { id: number; code: string; [key: string]: unknown };

function createMockDb(options: { proofs?: boolean; failTable?: unknown; insertError?: Error } = {}) {
  let rows = new Map<unknown, StoredRow[]>([[curriculum, []], [areas, []], [competencies, []]]);
  let nextId = 100;
  const deleteCalls: unknown[] = [];
  // Model only the case/accent equivalences exercised below, not a full MySQL collation.
  const comparableCode = (code: string) => code.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function selectFrom(source: Map<unknown, StoredRow[]>) {
    return vi.fn(() => ({
      from: vi.fn((table: unknown) => {
        const values = table === competencyProof
          ? (options.proofs ? [{ id: 1, code: '' }] : []) : source.get(table) ?? [];
        return Object.assign(Promise.resolve(values), {
          where: vi.fn((condition: unknown) => {
            const codes: string[] = [];
            function visit(value: unknown): void {
              if (!value || typeof value !== 'object') return;
              const node = value as { constructor: { name: string }; value?: unknown; queryChunks?: unknown[] };
              if (node.constructor.name === 'Param' && typeof node.value === 'string') codes.push(node.value);
              node.queryChunks?.forEach(visit);
              if (Array.isArray(value)) value.forEach(visit);
            }
            visit(condition);
            return Promise.resolve(values.filter((r) => codes.some((code) => comparableCode(code) === comparableCode(r.code))));
          }),
          limit: vi.fn(async (count: number) => values.slice(0, count)),
        });
      }),
    }));
  }

  function transactionApi(pending: Map<unknown, StoredRow[]>) {
    return {
      select: selectFrom(pending),
      delete: vi.fn(async (table: unknown) => { deleteCalls.push(table); pending.set(table, []); }),
      insert: vi.fn((table: unknown) => ({
        values: vi.fn((values: Omit<StoredRow, 'id'>[]) => {
          const execute = async () => {
            if (table === options.failTable) throw options.insertError ?? new Error('Insert failed');
            if (table === curriculum) {
              const seen = new Set((pending.get(table) ?? []).map((row) => comparableCode(row.code)));
              for (const value of values) {
                const code = comparableCode(String(value.code));
                if (seen.has(code)) throw Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
                seen.add(code);
              }
            }
            const inserted = values.map((value) => ({ ...value, id: nextId++ }) as StoredRow);
            pending.get(table)?.push(...inserted);
            return inserted.map(({ id }) => ({ id }));
          };
          return {
            $returningId: execute,
            then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => execute().then(resolve, reject),
          };
        }),
      })),
    };
  }

  return {
    select: vi.fn(() => selectFrom(rows)()),
    transaction: vi.fn(async (fn: (tx: ReturnType<typeof transactionApi>) => Promise<unknown>) => {
      const pending = new Map([...rows].map(([table, values]) => [table, structuredClone(values)]));
      const result = await fn(transactionApi(pending));
      rows = pending;
      return result;
    }),
    snapshot: () => structuredClone([...rows.values()]),
    rows: (table: unknown) => rows.get(table) ?? [],
    deleteCalls,
  };
}

describe('CurriculumService.importCurriculum', () => {
  it('importiert valide CSVs und gibt Zählung zurück', async () => {
    const db = createMockDb();
    const service = new CurriculumService(db as never);
    expect(await service.importCurriculum(validCurriculum, validAreas, validCompetencies))
      .toEqual({ curriculum: 1, areas: 2, competencies: 2 });
  });

  it('erhält bei aufeinanderfolgenden Importen bestehende Daten und ordnet neue Datenbank-IDs zu', async () => {
    const db = createMockDb();
    const service = new CurriculumService(db as never);
    await service.importCurriculum(validCurriculum, validAreas, validCompetencies);
    const before = db.snapshot();
    await service.importCurriculum(validCurriculum.replace('RLP_INF', 'RLP_WIRT'), validAreas, validCompetencies);
    expect(db.rows(curriculum).map((row) => row.code)).toEqual(['RLP_INF', 'RLP_WIRT']);
    db.snapshot().forEach((table, index) => expect(table.slice(0, before[index]?.length)).toEqual(before[index]));
    expect(db.deleteCalls).toEqual([]);
    const secondCurriculum = db.rows(curriculum)[1];
    const secondAreas = db.rows(areas).slice(2);
    expect(secondAreas.map((row) => row.curriculumId)).toEqual([secondCurriculum?.id, secondCurriculum?.id]);
    expect(db.rows(competencies).slice(2).map((row) => row.areaId)).toEqual(secondAreas.map((row) => row.id));
    expect(secondCurriculum?.id).not.toBe(1);
  });

  it('erlaubt neue Lehrpläne trotz vorhandener Kompetenznachweise', async () => {
    const service = new CurriculumService(createMockDb({ proofs: true }) as never);
    await expect(service.importCurriculum(validCurriculum, validAreas, validCompetencies)).resolves
      .toEqual({ curriculum: 1, areas: 2, competencies: 2 });
  });

  it('weist gemischte Uploads mit existierendem Code vollständig zurück und nennt den Konflikt', async () => {
    const db = createMockDb();
    const service = new CurriculumService(db as never);
    await service.importCurriculum(validCurriculum, validAreas, validCompetencies);
    const before = db.snapshot();
    const upload = validCurriculum + '2,RLP_NEU,Neuer Lehrplan\n';
    await expect(service.importCurriculum(upload, validAreas, validCompetencies)).rejects.toThrow(ConflictError);
    await expect(service.importCurriculum(upload, validAreas, validCompetencies)).rejects.toThrow('RLP_INF');
    expect(db.snapshot()).toEqual(before);
  });

  it.each(['rlp_inf', 'RLP_ÍNF'])('behandelt einen vorhandenen äquivalenten Code %s als Konflikt', async (code) => {
    const db = createMockDb();
    const service = new CurriculumService(db as never);
    await service.importCurriculum(validCurriculum, validAreas, validCompetencies);
    const before = db.snapshot();
    const upload = validCurriculum.replace('RLP_INF', code);
    await expect(service.importCurriculum(upload, validAreas, validCompetencies)).rejects.toThrow(ConflictError);
    await expect(service.importCurriculum(upload, validAreas, validCompetencies)).rejects.toThrow('RLP_INF');
    expect(db.snapshot()).toEqual(before);
  });

  it.each(['rlp_inf', 'RLP_ÍNF'])('weist kollationsgleiche Codes %s innerhalb eines Uploads als ungültige Eingabe zurück', async (code) => {
    const db = createMockDb();
    const service = new CurriculumService(db as never);
    const upload = validCurriculum + `2,${code},Zweiter Lehrplan\n`;
    await expect(service.importCurriculum(upload, validAreas, validCompetencies)).rejects.toThrow(BadRequestError);
    expect(db.rows(curriculum)).toEqual([]);
    expect(db.rows(areas)).toEqual([]);
    expect(db.rows(competencies)).toEqual([]);
  });

  it('rollt bei Fehlern nach dem Einfügen des Lehrplans den gesamten Upload zurück', async () => {
    const failure = new Error('Insert failed');
    const options: { failTable?: unknown; insertError?: Error } = {};
    const db = createMockDb(options);
    const service = new CurriculumService(db as never);
    await service.importCurriculum(validCurriculum, validAreas, validCompetencies);
    const before = db.snapshot();
    options.failTable = competencies;
    options.insertError = failure;
    await expect(service.importCurriculum(validCurriculum.replace('RLP_INF', 'RLP_NEU'), validAreas, validCompetencies)).rejects.toBe(failure);
    expect(db.snapshot()).toEqual(before);
  });

  it.each(['direkt', 'Drizzle-cause'])('übersetzt konkurrierende Unique-Konflikte (%s) in ConflictError', async (kind) => {
    const duplicate = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
    const error = kind === 'direkt' ? duplicate : new Error('Failed query', { cause: duplicate });
    const db = createMockDb({ failTable: curriculum, insertError: error });
    const service = new CurriculumService(db as never);
    await expect(service.importCurriculum(validCurriculum, validAreas, validCompetencies)).rejects.toThrow(ConflictError);
    await expect(service.importCurriculum(validCurriculum, validAreas, validCompetencies)).rejects.toThrow('RLP_INF');
    expect(db.rows(curriculum)).toEqual([]);
  });

  it('reicht andere Datenbankfehler unverändert weiter', async () => {
    const failure = Object.assign(new Error('Connection lost'), { code: 'ECONNRESET' });
    const db = createMockDb({ failTable: curriculum, insertError: failure });
    const service = new CurriculumService(db as never);
    await expect(service.importCurriculum(validCurriculum, validAreas, validCompetencies)).rejects.toBe(failure);
  });

  it('ordnet mehrere Lehrpläne im selben Upload über ihre CSV-IDs zu', async () => {
    const db = createMockDb();
    const service = new CurriculumService(db as never);
    const result = await service.importCurriculum(
      'id,code,titel\n20,RLP_INF,Informatik\n10,RLP_WIRT,Wirtschaft\n',
      'id,curriculum_id,code,titel\n90,10,B1,Wirtschaft\n80,20,A1,Informatik\n',
      'id,area_id,code,description\n60,80,A1.1,Informatik\n70,90,B1.1,Wirtschaft\n',
    );
    expect(result).toEqual({ curriculum: 2, areas: 2, competencies: 2 });
    const plans = db.rows(curriculum);
    const importedAreas = db.rows(areas);
    expect(importedAreas.map((row) => row.curriculumId)).toEqual([plans[1]?.id, plans[0]?.id]);
    expect(db.rows(competencies).map((row) => row.areaId)).toEqual([importedAreas[1]?.id, importedAreas[0]?.id]);
  });

  it.each([
    ['doppelte curriculum-ID', validCurriculum + '1,RLP_NEU,Neu\n', validAreas, validCompetencies],
    ['doppelte area-ID', validCurriculum, validAreas + '1,1,A3,Neu\n', validCompetencies],
    ['doppelte competency-ID', validCurriculum, validAreas, validCompetencies + '1,1,A1.2,Neu\n'],
    ['doppelter Lehrplancode', validCurriculum + '2,RLP_INF,Neu\n', validAreas, validCompetencies],
    ['fehlender Lehrplan', validCurriculum, validAreas.replace('1,1,A1', '1,99,A1'), validCompetencies],
    ['fehlender Bereich', validCurriculum, validAreas, validCompetencies.replace('1,1,A1.1', '1,99,A1.1')],
    ['ungültige Spalten', 'invalid,columns\n1,2\n', validAreas, validCompetencies],
  ])('weist %s vor Datenbankänderungen zurück', async (_case, plans, areaCsv, competencyCsv) => {
    const db = createMockDb();
    const service = new CurriculumService(db as never);
    await expect(service.importCurriculum(plans, areaCsv, competencyCsv)).rejects.toThrow(BadRequestError);
    expect(db.transaction).not.toHaveBeenCalled();
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
