import { describe, expect, it, vi, type Mock } from 'vitest';

import { CompetencyService, type SubmitInputPayload } from '../src/services/competencyService.js';
import {
  areas,
  competencies,
  competencyInput,
  competencyLlmOutput,
  competencyProof,
  curriculum,
} from '../src/db/schema.js';
import { ProofStatus } from '../src/status.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../src/utils/errors.js';
import type { LlmClient, LlmResult } from '../src/llm/types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validPayload: SubmitInputPayload & { subject: null } = {
  userRole: 'Entwickler',
  what: 'API implementieren',
  how: 'mit REST und Express',
  why: 'um Daten auszutauschen',
  environment: 'Firma XY',
  subject: null,
};

const mockLlmResult: LlmResult = {
  workResult: 'Gutes Arbeitsergebnis',
  quality: 3,
  qualityStatement: 'Solide Umsetzung mit klarem Bezug zur Kompetenz.',
  overlapCurriculum: true,
  noteImprovment: 'Könnte noch detaillierter sein',
};

function createMockLlm(): LlmClient & { generateCompetencyOutput: Mock } {
  return {
    generateCompetencyOutput: vi.fn(async () => mockLlmResult),
  };
}

interface MockDbOptions {
  proof?: { id: number; userId: string; status: number; competencyId?: number } | null;
  inputs?: Array<{ id: number; competencyProofId: number; userRole: string; what: string; how: string; why: string; environment: string; subject: string | null }>;
  outputs?: Array<{ id: number; competencyInputId: number; workResult: string; quality: number; qualityStatement: string; llmModel: string; overlapCurriculum: boolean; noteImprovment: string | null; isSaved: boolean; userFeedback: string | null; predecessor: number | null }>;
  competency?: { id: number; areaId: number; code: string; description: string } | null;
  area?: { id: number; curriculumId: number; code: string; titel: string } | null;
  curriculumRow?: { id: number; code: string; titel: string } | null;
}

function createMockDb(options: MockDbOptions = {}) {
  const {
    proof = { id: 1, userId: 'user-1', status: ProofStatus.Draft, competencyId: 1 },
    inputs = [],
    outputs = [],
    competency = { id: 1, areaId: 1, code: 'A1.1', description: 'Grundlagen der Informatik' },
    area = { id: 1, curriculumId: 1, code: 'A1', titel: 'Grundlagen' },
    curriculumRow = { id: 1, code: 'RLP_INF', titel: 'Informatik' },
  } = options;

  const insertedInputs: unknown[] = [];
  const insertedOutputs: unknown[] = [];
  const statusUpdates: Array<{ proofId: number; status: number }> = [];
  const updatedAtUpdates: Array<{ proofId: number }> = [];
  const savedUpdates: boolean[] = [];

  const db = {
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => {
        if (table === competencyProof) {
          return {
            where: vi.fn(() => ({
              limit: vi.fn(async () => (proof ? [proof] : [])),
            })),
          };
        }
        if (table === competencyInput) {
          return {
            where: vi.fn(() => {
              const result = [...inputs, ...insertedInputs];
              return Object.assign(Promise.resolve(result), {
                limit: async () => result,
              });
            }),
          };
        }
        if (table === competencyLlmOutput) {
          return {
            where: vi.fn(() => Object.assign(Promise.resolve([...outputs, ...insertedOutputs]), {
              limit: vi.fn(async () => {
                // Return initial outputs + any newly inserted ones
                return [...outputs, ...insertedOutputs];
              }),
            })),
          };
        }
        if (table === competencies) {
          return {
            where: vi.fn(() => ({
              limit: vi.fn(async () => (competency ? [competency] : [])),
            })),
          };
        }
        if (table === areas) {
          return {
            where: vi.fn(() => ({
              limit: vi.fn(async () => (area ? [area] : [])),
            })),
          };
        }
        if (table === curriculum) {
          return {
            where: vi.fn(() => ({
              limit: vi.fn(async () => (curriculumRow ? [curriculumRow] : [])),
            })),
          };
        }
        return {
          where: vi.fn(() => ({
            limit: vi.fn(async () => []),
          })),
        };
      }),
    })),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((vals: unknown) => ({
        $returningId: vi.fn(async () => {
          if (table === competencyInput) {
            const id = inputs.length + insertedInputs.length + 1;
            const inputRow = {
              id,
              competencyProofId: (vals as { competencyProofId?: number }).competencyProofId,
              userRole: (vals as { userRole?: string }).userRole ?? '',
              what: (vals as { what?: string }).what ?? '',
              how: (vals as { how?: string }).how ?? '',
              why: (vals as { why?: string }).why ?? '',
              environment: (vals as { environment?: string }).environment ?? '',
              subject: (vals as { subject?: string | null }).subject ?? null,
            };
            insertedInputs.push(inputRow);
            return [{ id }];
          }
          if (table === competencyLlmOutput) {
            const id = outputs.length + insertedOutputs.length + 1;
            const outputRow = {
              id,
              predecessor: (vals as { predecessor?: number }).predecessor ?? null,
              competencyInputId: (vals as { competencyInputId?: number }).competencyInputId,
              workResult: (vals as { workResult?: string }).workResult ?? '',
              quality: (vals as { quality?: number }).quality ?? 3,
              qualityStatement: (vals as { qualityStatement?: string }).qualityStatement ?? '',
              llmModel: (vals as { llmModel?: string }).llmModel ?? 'test',
              overlapCurriculum: (vals as { overlapCurriculum?: boolean }).overlapCurriculum ?? false,
              noteImprovment: (vals as { noteImprovment?: string | null }).noteImprovment ?? null,
              isSaved: false,
              userFeedback: (vals as { userFeedback?: string | null }).userFeedback ?? null,
            };
            insertedOutputs.push(outputRow);
            return [{ id }];
          }
          return [{ id: 1 }];
        }),
      })),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((vals: { status?: number; isSaved?: boolean; updatedAt?: Date }) => ({
        where: vi.fn(async () => {
          if (table === competencyProof) {
            if (vals.status !== undefined) {
              statusUpdates.push({ proofId: proof?.id ?? 1, status: vals.status });
              if (proof) proof.status = vals.status;
            }
            if (vals.updatedAt !== undefined) {
              updatedAtUpdates.push({ proofId: proof?.id ?? 1 });
            }
          }
          if (table === competencyLlmOutput && vals.isSaved !== undefined) {
            savedUpdates.push(vals.isSaved);
          }
          return [];
        }),
      })),
    })),
    _insertedInputs: insertedInputs,
    _insertedOutputs: insertedOutputs,
    _statusUpdates: statusUpdates,
    _updatedAtUpdates: updatedAtUpdates,
    _savedUpdates: savedUpdates,
  };

  Object.assign(db, {
    transaction: vi.fn(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db)),
  });

  return db;
}

// ─── saveInput ───────────────────────────────────────────────────────────────

describe('CompetencyService.saveInput', () => {
  it('setzt eine überarbeitete Auswertung auf Entwurf zurück und prüft die neue Eingabe', async () => {
    const proof = { id: 1, userId: 'user-1', status: ProofStatus.LlmCheckFinished as number, competencyId: 1 };
    const db = createMockDb({ proof });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');
    const revisedPayload = { ...validPayload, what: 'Überarbeitete API implementieren' };

    const input = await service.saveInput('user-1', 1, revisedPayload);

    expect(input).toMatchObject(revisedPayload);
    expect(proof.status).toBe(ProofStatus.Draft);
    expect(llm.generateCompetencyOutput).not.toHaveBeenCalled();

    const output = await service.triggerLlmCheck('user-1', 1);

    expect(output).toMatchObject({ competencyInputId: input.id });
    expect(llm.generateCompetencyOutput).toHaveBeenCalledTimes(1);
    expect(llm.generateCompetencyOutput).toHaveBeenCalledWith(
      expect.objectContaining(revisedPayload),
    );
    expect(db._statusUpdates).toEqual([
      { proofId: 1, status: ProofStatus.Draft },
      { proofId: 1, status: ProofStatus.LlmCheck },
      { proofId: 1, status: ProofStatus.LlmCheckFinished },
    ]);
  });

  it('behält beim Speichern nach fehlgeschlagener Prüfung den Status bei', async () => {
    const proof = { id: 1, userId: 'user-1', status: ProofStatus.LlmCheckFailed, competencyId: 1 };
    const db = createMockDb({ proof });
    const service = new CompetencyService(db as never, createMockLlm(), 'test-model');

    await service.saveInput('user-1', 1, validPayload);

    expect(proof.status).toBe(ProofStatus.LlmCheckFailed);
    expect(db._statusUpdates).toHaveLength(0);
  });

  it('speichert die Eingabe ohne LLM-Call', async () => {
    const db = createMockDb();
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');

    const result = await service.saveInput('user-1', 1, validPayload);

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(llm.generateCompetencyOutput).not.toHaveBeenCalled();
  });

  it('setzt den Status nicht auf llm_check', async () => {
    const db = createMockDb();
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');

    await service.saveInput('user-1', 1, validPayload);

    expect(db._statusUpdates).toHaveLength(0);
  });

  it('wirft ForbiddenError bei fremder proofId', async () => {
    const db = createMockDb({ proof: null });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');

    await expect(service.saveInput('user-1', 1, validPayload)).rejects.toThrow(NotFoundError);
  });

  it.each([ProofStatus.LlmCheck, ProofStatus.Saved, ProofStatus.Discarded])('verhindert Speichern bei gesperrtem Status %s', async (status) => {
    const db = createMockDb({ proof: { id: 1, userId: 'user-1', status } });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');

    await expect(service.saveInput('user-1', 1, validPayload)).rejects.toThrow(ForbiddenError);
  });

  it('aktualisiert updatedAt der Karte beim Speichern', async () => {
    const db = createMockDb();
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');

    await service.saveInput('user-1', 1, validPayload);

    expect(db._updatedAtUpdates).toEqual([{ proofId: 1 }]);
  });
});

// ─── triggerLlmCheck ─────────────────────────────────────────────────────────

describe('CompetencyService.triggerLlmCheck', () => {
  it('wirft NotFoundError wenn keine Eingabe vorhanden ist', async () => {
    const db = createMockDb({ inputs: [] });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');

    await expect(service.triggerLlmCheck('user-1', 1)).rejects.toThrow(NotFoundError);
    expect(llm.generateCompetencyOutput).not.toHaveBeenCalled();
  });

  it('ruft LLM auf und speichert Output bei vorhandener Eingabe', async () => {
    const input = {
      id: 1,
      competencyProofId: 1,
      userRole: 'Entwickler',
      what: 'API implementieren',
      how: 'mit REST und Express',
      why: 'um Daten auszutauschen',
      environment: 'Firma XY',
      subject: null,
    };
    const db = createMockDb({ inputs: [input] });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');

    const result = await service.triggerLlmCheck('user-1', 1);

    expect(result).not.toBeNull();
    expect(llm.generateCompetencyOutput).toHaveBeenCalledTimes(1);
    expect(llm.generateCompetencyOutput).toHaveBeenCalledWith({
      userRole: 'Entwickler',
      what: 'API implementieren',
      how: 'mit REST und Express',
      why: 'um Daten auszutauschen',
      environment: 'Firma XY',
      subject: null,
      context: {
        competency: { code: 'A1.1', description: 'Grundlagen der Informatik' },
        area: { code: 'A1', titel: 'Grundlagen' },
        curriculum: { code: 'RLP_INF', titel: 'Informatik' },
      },
    });
  });

  it('setzt Status auf llm_check und dann llm_check_finished', async () => {
    const input = {
      id: 1,
      competencyProofId: 1,
      userRole: 'Entwickler',
      what: 'API implementieren',
      how: 'mit REST und Express',
      why: 'um Daten auszutauschen',
      environment: 'Firma XY',
      subject: null,
    };
    const db = createMockDb({ inputs: [input] });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');

    await service.triggerLlmCheck('user-1', 1);

    expect(db._statusUpdates).toEqual([
      { proofId: 1, status: ProofStatus.LlmCheck },
      { proofId: 1, status: ProofStatus.LlmCheckFinished },
    ]);
  });

  it('setzt Status auf llm_check_failed bei LLM-Fehler', async () => {
    const input = {
      id: 1,
      competencyProofId: 1,
      userRole: 'Entwickler',
      what: 'API implementieren',
      how: 'mit REST und Express',
      why: 'um Daten auszutauschen',
      environment: 'Firma XY',
      subject: null,
    };
    const db = createMockDb({ inputs: [input] });
    const llm = createMockLlm();
    (llm.generateCompetencyOutput as Mock).mockRejectedValueOnce(new Error('LLM down'));
    const service = new CompetencyService(db as never, llm, 'test-model');

    const result = await service.triggerLlmCheck('user-1', 1);

    expect(result).toBeNull();
    expect(db._statusUpdates).toEqual([
      { proofId: 1, status: ProofStatus.LlmCheck },
      { proofId: 1, status: ProofStatus.LlmCheckFailed },
    ]);
  });

  it('wirft ForbiddenError wenn Karte nicht in draft/llm_check_failed ist', async () => {
    const input = {
      id: 1,
      competencyProofId: 1,
      userRole: 'Entwickler',
      what: 'API implementieren',
      how: 'mit REST und Express',
      why: 'um Daten auszutauschen',
      environment: 'Firma XY',
      subject: null,
    };
    const db = createMockDb({
      proof: { id: 1, userId: 'user-1', status: ProofStatus.Saved },
      inputs: [input],
    });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');

    await expect(service.triggerLlmCheck('user-1', 1)).rejects.toThrow(ForbiddenError);
    expect(llm.generateCompetencyOutput).not.toHaveBeenCalled();
  });

  it('verwendet die neueste Eingabe (höchste ID)', async () => {
    const input1 = {
      id: 1,
      competencyProofId: 1,
      userRole: 'Alte Rolle',
      what: 'Altes was',
      how: 'Altes wie',
      why: 'Alter Zweck',
      environment: 'Alte Umgebung',
      subject: null,
    };
    const input2 = {
      id: 2,
      competencyProofId: 1,
      userRole: 'Neue Rolle',
      what: 'Neues was',
      how: 'Neues wie',
      why: 'Neuer Zweck',
      environment: 'Neue Umgebung',
      subject: 'Neues Thema',
    };
    const db = createMockDb({ inputs: [input1, input2] });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');

    await service.triggerLlmCheck('user-1', 1);

    expect(llm.generateCompetencyOutput).toHaveBeenCalledWith({
      userRole: 'Neue Rolle',
      what: 'Neues was',
      how: 'Neues wie',
      why: 'Neuer Zweck',
      environment: 'Neue Umgebung',
      subject: 'Neues Thema',
      context: {
        competency: { code: 'A1.1', description: 'Grundlagen der Informatik' },
        area: { code: 'A1', titel: 'Grundlagen' },
        curriculum: { code: 'RLP_INF', titel: 'Informatik' },
      },
    });
  });

  it('wirft BadRequestError wenn Pflichtfelder leer sind', async () => {
    const input = {
      id: 1,
      competencyProofId: 1,
      userRole: '',
      what: 'API implementieren',
      how: 'mit REST und Express',
      why: 'um Daten auszutauschen',
      environment: 'Firma XY',
      subject: null,
    };
    const db = createMockDb({ inputs: [input] });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');

    await expect(service.triggerLlmCheck('user-1', 1)).rejects.toThrow(BadRequestError);
    expect(llm.generateCompetencyOutput).not.toHaveBeenCalled();
  });

  it('wirft BadRequestError wenn mehrere Pflichtfelder leer sind', async () => {
    const input = {
      id: 1,
      competencyProofId: 1,
      userRole: '',
      what: '',
      how: 'mit REST und Express',
      why: '',
      environment: 'Firma XY',
      subject: null,
    };
    const db = createMockDb({ inputs: [input] });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');

    await expect(service.triggerLlmCheck('user-1', 1)).rejects.toThrow(
      /userRole, what, why/,
    );
    expect(llm.generateCompetencyOutput).not.toHaveBeenCalled();
  });

  it('wirft BadRequestError wenn Felder nur Whitespace enthalten', async () => {
    const input = {
      id: 1,
      competencyProofId: 1,
      userRole: '   ',
      what: 'API implementieren',
      how: 'mit REST und Express',
      why: 'um Daten auszutauschen',
      environment: 'Firma XY',
      subject: null,
    };
    const db = createMockDb({ inputs: [input] });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');

    await expect(service.triggerLlmCheck('user-1', 1)).rejects.toThrow(BadRequestError);
    expect(llm.generateCompetencyOutput).not.toHaveBeenCalled();
  });

  it('setzt Status nicht auf llm_check, wenn der Kontext nicht geladen werden kann', async () => {
    const input = {
      id: 1,
      competencyProofId: 1,
      userRole: 'Entwickler',
      what: 'API implementieren',
      how: 'mit REST und Express',
      why: 'um Daten auszutauschen',
      environment: 'Firma XY',
      subject: null,
    };
    const db = createMockDb({ inputs: [input], competency: null });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');

    await expect(service.triggerLlmCheck('user-1', 1)).rejects.toThrow(NotFoundError);
    expect(llm.generateCompetencyOutput).not.toHaveBeenCalled();
    expect(db._statusUpdates).toHaveLength(0);
  });
});

// ─── retryOutput ─────────────────────────────────────────────────────────────

describe('CompetencyService.retryOutput', () => {
  it('setzt Status nicht auf llm_check, wenn der Kontext nicht geladen werden kann', async () => {
    const input = {
      id: 1,
      competencyProofId: 1,
      userRole: 'Entwickler',
      what: 'API implementieren',
      how: 'mit REST und Express',
      why: 'um Daten auszutauschen',
      environment: 'Firma XY',
      subject: null,
    };
    const output = {
      id: 1,
      competencyInputId: 1,
      workResult: 'Ergebnis',
      quality: 3,
      qualityStatement: 'Solide',
      llmModel: 'test',
      overlapCurriculum: true,
      noteImprovment: null,
      isSaved: false,
      userFeedback: null,
      predecessor: null,
    };
    const db = createMockDb({
      proof: { id: 1, userId: 'user-1', status: ProofStatus.LlmCheckFinished, competencyId: 1 },
      inputs: [input],
      outputs: [output],
      competency: null,
    });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');

    await expect(service.retryOutput('user-1', 1, 'Bitte detaillierter')).rejects.toThrow(NotFoundError);
    expect(llm.generateCompetencyOutput).not.toHaveBeenCalled();
    expect(db._statusUpdates).toHaveLength(0);
  });
});

describe('Auswertungsaktionen auf veralteten Karten', () => {
  const output = { id: 1, competencyInputId: 1, ...mockLlmResult, llmModel: 'test',
    isSaved: false, userFeedback: null, predecessor: null };

  it('erlaubt die Übernahme der aktuellen fertigen Auswertung', async () => {
    const db = createMockDb({
      proof: { id: 1, userId: 'user-1', status: ProofStatus.LlmCheckFinished, competencyId: 1 },
      inputs: [{ id: 1, competencyProofId: 1, ...validPayload }], outputs: [output],
    });
    const service = new CompetencyService(db as never, createMockLlm(), 'test');
    await service.acceptOutput('user-1', 1);
    expect(db._statusUpdates).toContainEqual({ proofId: 1, status: ProofStatus.Saved });
  });

  it('erlaubt die Auswahl einer älteren Revision und entfernt die bisherige Auswahl', async () => {
    const selected = { ...output, id: 2, predecessor: 1, isSaved: true };
    const db = createMockDb({
      proof: { id: 1, userId: 'user-1', status: ProofStatus.Saved, competencyId: 1 },
      inputs: [{ id: 1, competencyProofId: 1, ...validPayload }],
      outputs: [output, selected],
    });
    const service = new CompetencyService(db as never, createMockLlm(), 'test');

    await service.acceptOutput('user-1', 1);

    expect(db._savedUpdates).toEqual([false, true]);
    expect(db._statusUpdates).toContainEqual({ proofId: 1, status: ProofStatus.Saved });
  });

  it.each([ProofStatus.LlmCheckFinished, ProofStatus.LlmCheckFailed])('erlaubt Retry der aktuellen Revision bei Status %s', async (status) => {
    const db = createMockDb({
      proof: { id: 1, userId: 'user-1', status, competencyId: 1 },
      inputs: [{ id: 1, competencyProofId: 1, ...validPayload }], outputs: [output],
    });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test');
    await service.retryOutput('user-1', 1, 'Genauer erklären');
    expect(llm.generateCompetencyOutput).toHaveBeenCalledWith(expect.objectContaining({ userFeedback: 'Genauer erklären' }));
  });

  it.each([ProofStatus.Draft, ProofStatus.LlmCheck, ProofStatus.Discarded])(
    'verhindert Übernahme und Retry bei Status %s', async (status) => {
      const db = createMockDb({
        proof: { id: 1, userId: 'user-1', status, competencyId: 1 },
        inputs: [{ id: 1, competencyProofId: 1, ...validPayload }], outputs: [output],
      });
      const llm = createMockLlm();
      const service = new CompetencyService(db as never, llm, 'test');
      await expect(service.acceptOutput('user-1', 1)).rejects.toThrow(ForbiddenError);
      await expect(service.retryOutput('user-1', 1, 'Feedback')).rejects.toThrow(ForbiddenError);
      expect(db.update).not.toHaveBeenCalled();
      expect(llm.generateCompetencyOutput).not.toHaveBeenCalled();
    },
  );

  it('verhindert Aktionen auf Outputs einer überholten Eingabe', async () => {
    const input = { id: 1, competencyProofId: 1, ...validPayload };
    const db = createMockDb({
      proof: { id: 1, userId: 'user-1', status: ProofStatus.LlmCheckFinished, competencyId: 1 },
      inputs: [input, { ...input, id: 2 }],
      outputs: [output],
    });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test');
    await expect(service.acceptOutput('user-1', 1)).rejects.toThrow(ForbiddenError);
    await expect(service.retryOutput('user-1', 1, 'Feedback')).rejects.toThrow(ForbiddenError);
    expect(db.update).not.toHaveBeenCalled();
    expect(llm.generateCompetencyOutput).not.toHaveBeenCalled();
  });

  it('erlaubt die Auswahl, aber keinen Retry einer älteren Revision derselben Eingabe', async () => {
    const input = { id: 1, competencyProofId: 1, ...validPayload };
    const db = createMockDb({
      proof: { id: 1, userId: 'user-1', status: ProofStatus.LlmCheckFinished, competencyId: 1 },
      inputs: [input],
      outputs: [output, { ...output, id: 2, predecessor: 1 }],
    });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test');

    await expect(service.acceptOutput('user-1', 1)).resolves.toMatchObject({ id: 1, isSaved: true });
    await expect(service.retryOutput('user-1', 1, 'Feedback')).rejects.toThrow(ForbiddenError);
    expect(llm.generateCompetencyOutput).not.toHaveBeenCalled();
  });
});
