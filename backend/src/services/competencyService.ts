import { and, asc, eq } from 'drizzle-orm';

import type { Database } from '../db/client.js';
import {
  competencyInput,
  competencyLlmOutput,
  competencyProof,
  type CompetencyInput,
  type CompetencyLlmOutput,
  type CompetencyProof,
} from '../db/schema.js';
import { ProofStatus } from '../status.js';

import type { LlmClient, LlmRequest } from '../llm/types.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface CreateProofInput {
  competencyId: number;
  /** Duplikat einer eigenen Karte (ADR-007); NULL bei neuen Karten. */
  copiedFromProofId?: number | null;
}

export interface SubmitInputPayload {
  userRole: string;
  what: string;
  how: string;
  why: string;
  environment: string;
  subject?: string | null;
}

export interface ProofWithOutputs extends CompetencyProof {
  inputs: Array<CompetencyInput & { outputs: CompetencyLlmOutput[] }>;
}

/**
 * Competency-Service: Kern-Datenfluss „Kompetenzkarte erzeugen" (ARCHITECTURE.md §4).
 *
 * Business Logic **und** Drizzle-Queries (ADR-005). Der LLM-Client steht hinter
 * dem `LlmClient`-Interface und wird in Tests gemockt.
 */
export class CompetencyService {
  constructor(
    private readonly db: Database,
    private readonly llm: LlmClient,
    /** Verwendetes Modell — wird in `competency_llm_output.llm_model` gespeichert. */
    private readonly llmModel: string,
  ) {}

  /** Legt eine neue Kompetenzkarte an (Status: `draft`). */
  async createProof(userId: string, input: CreateProofInput): Promise<CompetencyProof> {
    if (input.copiedFromProofId !== undefined && input.copiedFromProofId !== null) {
      await this.assertOwnProof(userId, input.copiedFromProofId);
    }

    const [result] = await this.db
      .insert(competencyProof)
      .values({
        userId,
        competencyId: input.competencyId,
        copiedFromProofId: input.copiedFromProofId ?? null,
        status: ProofStatus.Draft,
      })
      .$returningId();
    if (!result) {
      throw new Error('Insert competency_proof: keine ID zurückgegeben');
    }

    const [created] = await this.db
      .select()
      .from(competencyProof)
      .where(eq(competencyProof.id, result.id))
      .limit(1);
    if (!created) {
      throw new Error('Insert competency_proof: Zeile nicht gefunden');
    }
    return created;
  }

  /** Listet die Kompetenzkarten eines Nutzers (neueste zuerst). */
  async listProofs(userId: string): Promise<CompetencyProof[]> {
    return this.db
      .select()
      .from(competencyProof)
      .where(eq(competencyProof.userId, userId))
      .orderBy(asc(competencyProof.id));
  }

  /** Lädt eine Karte inkl. Eingaben und LLM-Outputs (nur eigene Karten). */
  async getProof(userId: string, proofId: number): Promise<ProofWithOutputs> {
    const proof = await this.assertOwnProof(userId, proofId);

    const inputs = await this.db
      .select()
      .from(competencyInput)
      .where(eq(competencyInput.competencyProofId, proofId));

    const withOutputs = await Promise.all(
      inputs.map(async (input) => {
        const outputs = await this.db
          .select()
          .from(competencyLlmOutput)
          .where(eq(competencyLlmOutput.competencyInputId, input.id));
        return { ...input, outputs };
      }),
    );

    return { ...proof, inputs: withOutputs };
  }

  /**
   * Erfasst die strukturierte Eingabe und löst die LLM-Prüfung aus.
   *
   * Flow: `draft`/`llm_check_failed` → `llm_check` (2) → LLM-Call →
   * `llm_check_finished` (4) bei Erfolg, `llm_check_failed` (3) bei Fehler.
   */
  async submitInput(
    userId: string,
    proofId: number,
    payload: SubmitInputPayload,
  ): Promise<CompetencyLlmOutput | null> {
    const proof = await this.assertOwnProof(userId, proofId);
    if (proof.status !== ProofStatus.Draft && proof.status !== ProofStatus.LlmCheckFailed) {
      throw new ForbiddenError('Karte ist nicht in einem prüfbaren Zustand');
    }

    const [inputResult] = await this.db
      .insert(competencyInput)
      .values({
        competencyProofId: proofId,
        userRole: payload.userRole,
        what: payload.what,
        how: payload.how,
        why: payload.why,
        environment: payload.environment,
        subject: payload.subject ?? null,
      })
      .$returningId();
    if (!inputResult) {
      throw new Error('Insert competency_input: keine ID zurückgegeben');
    }

    await this.setProofStatus(proofId, ProofStatus.LlmCheck);

    const llmRequest: LlmRequest = {
      userRole: payload.userRole,
      what: payload.what,
      how: payload.how,
      why: payload.why,
      environment: payload.environment,
      subject: payload.subject ?? null,
    };

    return this.runLlmCheck(proofId, inputResult.id, null, llmRequest);
  }

  /**
   * Retry mit Feedback: erzeugt eine neue LLM-Revision (`predecessor` = alte Revision).
   */
  async retryOutput(
    userId: string,
    outputId: number,
    userFeedback: string,
  ): Promise<CompetencyLlmOutput> {
    const output = await this.db
      .select()
      .from(competencyLlmOutput)
      .where(eq(competencyLlmOutput.id, outputId))
      .limit(1);
    const previous = output[0];
    if (!previous) {
      throw new NotFoundError('LLM-Output nicht gefunden');
    }

    const input = await this.db
      .select()
      .from(competencyInput)
      .where(eq(competencyInput.id, previous.competencyInputId))
      .limit(1);
    const inputRow = input[0];
    if (!inputRow) {
      throw new NotFoundError('Zugehörige Eingabe nicht gefunden');
    }

    const proof = await this.db
      .select()
      .from(competencyProof)
      .where(eq(competencyProof.id, inputRow.competencyProofId))
      .limit(1);
    const proofRow = proof[0];
    if (!proofRow || proofRow.userId !== userId) {
      throw new ForbiddenError('Kein Zugriff auf diese Karte');
    }

    await this.setProofStatus(proofRow.id, ProofStatus.LlmCheck);

    const llmRequest: LlmRequest = {
      userRole: inputRow.userRole,
      what: inputRow.what,
      how: inputRow.how,
      why: inputRow.why,
      environment: inputRow.environment,
      subject: inputRow.subject,
      userFeedback,
    };

    const result = await this.runLlmCheck(
      proofRow.id,
      inputRow.id,
      previous.id,
      llmRequest,
      userFeedback,
    );
    if (!result) {
      throw new NotFoundError('LLM-Prüfung fehlgeschlagen');
    }
    return result;
  }

  /** Akzeptiert einen LLM-Output (`is_saved = true`) und speichert die Karte. */
  async acceptOutput(userId: string, outputId: number): Promise<CompetencyLlmOutput> {
    const { proofId } = await this.loadOwnOutput(userId, outputId);

    await this.db
      .update(competencyLlmOutput)
      .set({ isSaved: true })
      .where(eq(competencyLlmOutput.id, outputId));

    await this.setProofStatus(proofId, ProofStatus.Saved);

    const [updated] = await this.db
      .select()
      .from(competencyLlmOutput)
      .where(eq(competencyLlmOutput.id, outputId))
      .limit(1);
    if (!updated) {
      throw new NotFoundError('LLM-Output nicht gefunden');
    }
    return updated;
  }

  /** Verwirft eine Karte (Status: `discarded`). */
  async discardProof(userId: string, proofId: number): Promise<CompetencyProof> {
    await this.assertOwnProof(userId, proofId);
    await this.setProofStatus(proofId, ProofStatus.Discarded);
    return this.assertOwnProof(userId, proofId);
  }

  /**
   * Führt den LLM-Call aus und persistiert das Ergebnis.
   * @returns der gespeicherte Output oder `null` bei Fehlschlag.
   */
  private async runLlmCheck(
    proofId: number,
    inputId: number,
    predecessor: number | null,
    request: LlmRequest,
    userFeedback?: string,
  ): Promise<CompetencyLlmOutput | null> {
    try {
      const result = await this.llm.generateCompetencyOutput(request);

      const [outputResult] = await this.db
        .insert(competencyLlmOutput)
        .values({
          predecessor,
          competencyInputId: inputId,
          workResult: result.workResult,
          quality: result.quality,
          llmModel: this.llmModel,
          overlapCurriculum: result.overlapCurriculum,
          noteImprovment: result.noteImprovment,
          isSaved: false,
          userFeedback: userFeedback ?? null,
        })
        .$returningId();
      if (!outputResult) {
        throw new Error('Insert competency_llm_output: keine ID zurückgegeben');
      }

      await this.setProofStatus(proofId, ProofStatus.LlmCheckFinished);

      const [output] = await this.db
        .select()
        .from(competencyLlmOutput)
        .where(eq(competencyLlmOutput.id, outputResult.id))
        .limit(1);
      if (!output) {
        throw new Error('Insert competency_llm_output: Zeile nicht gefunden');
      }
      return output;
    } catch (err) {
      logger.error({ err }, 'LLM-Prüfung fehlgeschlagen');
      await this.setProofStatus(proofId, ProofStatus.LlmCheckFailed);
      return null;
    }
  }

  /** Setzt den Status einer Karte. */
  private async setProofStatus(proofId: number, status: number): Promise<void> {
    await this.db
      .update(competencyProof)
      .set({ status })
      .where(eq(competencyProof.id, proofId));
  }

  /** Lädt eine Karte und stellt sicher, dass sie zum Nutzer gehört. */
  private async assertOwnProof(userId: string, proofId: number): Promise<CompetencyProof> {
    const rows = await this.db
      .select()
      .from(competencyProof)
      .where(and(eq(competencyProof.id, proofId), eq(competencyProof.userId, userId)))
      .limit(1);
    const proof = rows[0];
    if (!proof) {
      throw new NotFoundError('Kompetenzkarte nicht gefunden');
    }
    return proof;
  }

  /** Lädt einen LLM-Output samt zugehöriger `proofId` und stellt sicher, dass er zum Nutzer gehört. */
  private async loadOwnOutput(
    userId: string,
    outputId: number,
  ): Promise<{ output: CompetencyLlmOutput; proofId: number }> {
    const outputs = await this.db
      .select()
      .from(competencyLlmOutput)
      .where(eq(competencyLlmOutput.id, outputId))
      .limit(1);
    const output = outputs[0];
    if (!output) {
      throw new NotFoundError('LLM-Output nicht gefunden');
    }

    const inputs = await this.db
      .select()
      .from(competencyInput)
      .where(eq(competencyInput.id, output.competencyInputId))
      .limit(1);
    const input = inputs[0];
    if (!input) {
      throw new NotFoundError('Zugehörige Eingabe nicht gefunden');
    }

    const proofs = await this.db
      .select()
      .from(competencyProof)
      .where(eq(competencyProof.id, input.competencyProofId))
      .limit(1);
    const proof = proofs[0];
    if (!proof || proof.userId !== userId) {
      throw new ForbiddenError('Kein Zugriff auf diese Karte');
    }

    return { output, proofId: proof.id };
  }
}
