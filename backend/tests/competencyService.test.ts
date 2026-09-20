import { describe, expect, it, vi, type Mock } from 'vitest';

import { CompetencyService, type SubmitInputPayload } from '../src/services/competencyService.js';
import {
  competencyInput,
  competencyLlmOutput,
  competencyProof,
} from '../src/db/schema.js';
import { ProofStatus } from '../src/status.js';
import { ForbiddenError, NotFoundError } from '../src/utils/errors.js';
import type { LlmClient, LlmResult } from '../src/llm/types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validPayload: SubmitInputPayload = {
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
  overlapCurriculum: true,
  noteImprovment: 'Könnte noch detaillierter sein',
};

function createMockLlm(): LlmClient & { generateCompetencyOutput: Mock } {
  return {
    generateCompetencyOutput: vi.fn(async () => mockLlmResult),
  };
}

interface MockDbOptions {
  proof?: { id: number; userId: string; status: number } | null;
  inputs?: Array<{ id: number; competencyProofId: number; userRole: string; what: string; how: string; why: string; environment: string; subject: string | null }>;
  outputs?: Array<{ id: number; competencyInputId: number; workResult: string; quality: number; llmModel: string; overlapCurriculum: boolean; noteImprovment: string | null; isSaved: boolean; userFeedback: string | null; predecessor: number | null }>;
}

function createMockDb(options: MockDbOptions = {}) {
  const { proof = { id: 1, userId: 'user-1', status: ProofStatus.Draft }, inputs = [], outputs = [] } = options;

  const insertedInputs: unknown[] = [];
  const insertedOutputs: unknown[] = [];
  const statusUpdates: Array<{ proofId: number; status: number }> = [];

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
            where: vi.fn(async () => inputs),
          };
        }
        if (table === competencyLlmOutput) {
          return {
            where: vi.fn(() => ({
              limit: vi.fn(async () => {
                // Return initial outputs + any newly inserted ones
                return [...outputs, ...insertedOutputs];
              }),
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
            const id = inputs.length + 1;
            insertedInputs.push(vals);
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
      set: vi.fn((vals: { status?: number; isSaved?: boolean }) => ({
        where: vi.fn(async () => {
          if (table === competencyProof && vals.status !== undefined) {
            statusUpdates.push({ proofId: proof?.id ?? 1, status: vals.status });
          }
          return [];
        }),
      })),
    })),
    _insertedInputs: insertedInputs,
    _insertedOutputs: insertedOutputs,
    _statusUpdates: statusUpdates,
  };

  return db;
}

// ─── saveInput ───────────────────────────────────────────────────────────────

describe('CompetencyService.saveInput', () => {
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

  it('wirft ForbiddenError wenn Karte nicht in draft/llm_check_failed ist', async () => {
    const db = createMockDb({ proof: { id: 1, userId: 'user-1', status: ProofStatus.Saved } });
    const llm = createMockLlm();
    const service = new CompetencyService(db as never, llm, 'test-model');

    await expect(service.saveInput('user-1', 1, validPayload)).rejects.toThrow(ForbiddenError);
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
      why: 'Altes warum',
      environment: 'Alte Umgebung',
      subject: null,
    };
    const input2 = {
      id: 2,
      competencyProofId: 1,
      userRole: 'Neue Rolle',
      what: 'Neues was',
      how: 'Neues wie',
      why: 'Neues warum',
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
      why: 'Neues warum',
      environment: 'Neue Umgebung',
      subject: 'Neues Thema',
    });
  });
});
