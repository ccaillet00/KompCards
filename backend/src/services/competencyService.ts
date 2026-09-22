import { and, asc, eq } from 'drizzle-orm';

import type { Database } from '../db/client.js';
import {
  areas,
  competencies,
  competencyInput,
  competencyLlmOutput,
  competencyProof,
  curriculum,
  type CompetencyInput,
  type CompetencyLlmOutput,
  type CompetencyProof,
} from '../db/schema.js';
import { ProofStatus } from '../status.js';

import type { LlmClient, LlmContext, LlmRequest } from '../llm/types.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';
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
   * Speichert die strukturierte Eingabe **ohne** LLM-Call.
   *
   * Nach einer abgeschlossenen Prüfung wird die Karte wieder zum Entwurf;
   * `draft` und `llm_check_failed` bleiben unverändert.
   * Die LLM-Prüfung wird separat via `triggerLlmCheck` ausgelöst.
   */
  async saveInput(
    userId: string,
    proofId: number,
    payload: SubmitInputPayload,
  ): Promise<CompetencyInput> {
    const proof = await this.assertOwnProof(userId, proofId);
    if (proof.status !== ProofStatus.Draft && proof.status !== ProofStatus.LlmCheckFailed && proof.status !== ProofStatus.LlmCheckFinished) {
      throw new ForbiddenError('Karte ist nicht in einem speicherbaren Zustand');
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

    const [created] = await this.db
      .select()
      .from(competencyInput)
      .where(eq(competencyInput.id, inputResult.id))
      .limit(1);
    if (!created) {
      throw new Error('Insert competency_input: Zeile nicht gefunden');
    }

    await this.db
      .update(competencyProof)
      .set({
        updatedAt: new Date(),
        ...(proof.status === ProofStatus.LlmCheckFinished ? { status: ProofStatus.Draft } : {}),
      })
      .where(eq(competencyProof.id, proofId));

    return created;
  }

  /**
   * Löst die LLM-Prüfung für die neueste gespeicherte Eingabe aus.
   *
   * Flow: `draft`/`llm_check_failed` → `llm_check` (2) → LLM-Call →
   * `llm_check_finished` (4) bei Erfolg, `llm_check_failed` (3) bei Fehler.
   *
   * @throws NotFoundError wenn keine Eingabe für die Karte vorhanden ist.
   * @throws ForbiddenError wenn die Karte nicht in `draft`/`llm_check_failed` ist.
   */
  async triggerLlmCheck(
    userId: string,
    proofId: number,
  ): Promise<CompetencyLlmOutput | null> {
    const proof = await this.assertOwnProof(userId, proofId);
    if (proof.status !== ProofStatus.Draft && proof.status !== ProofStatus.LlmCheckFailed) {
      throw new ForbiddenError('Karte ist nicht in einem prüfbaren Zustand');
    }

    const inputs = await this.db
      .select()
      .from(competencyInput)
      .where(eq(competencyInput.competencyProofId, proofId));

    if (inputs.length === 0) {
      throw new NotFoundError('Keine Eingabe für diese Karte vorhanden');
    }

    // Neueste Eingabe (höchste ID) verwenden
    const latestInput = inputs.reduce((a, b) => (a.id > b.id ? a : b));

    // Alle Pflichtfelder müssen befüllt sein, bevor der LLM-Check startet
    const requiredFields: Array<[string, string]> = [
      ['userRole', latestInput.userRole],
      ['what', latestInput.what],
      ['how', latestInput.how],
      ['why', latestInput.why],
      ['environment', latestInput.environment],
    ];
    const emptyFields = requiredFields.filter(([, value]) => value.trim() === '');
    if (emptyFields.length > 0) {
      throw new BadRequestError(
        `Folgende Felder sind nicht befüllt: ${emptyFields.map(([name]) => name).join(', ')}`,
      );
    }

    const context = await this.loadLlmContext(proof.competencyId);

    await this.setProofStatus(proofId, ProofStatus.LlmCheck);

    const llmRequest: LlmRequest = {
      userRole: latestInput.userRole,
      what: latestInput.what,
      how: latestInput.how,
      why: latestInput.why,
      environment: latestInput.environment,
      subject: latestInput.subject,
      context,
    };

    return this.runLlmCheck(proofId, latestInput.id, null, llmRequest);
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

    await this.assertCurrentOutput(proofRow, previous, true);

    const context = await this.loadLlmContext(proofRow.competencyId);

    await this.setProofStatus(proofRow.id, ProofStatus.LlmCheck);

    const llmRequest: LlmRequest = {
      userRole: inputRow.userRole,
      what: inputRow.what,
      how: inputRow.how,
      why: inputRow.why,
      environment: inputRow.environment,
      subject: inputRow.subject,
      userFeedback,
      context,
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

  /**
   * Wählt einen LLM-Output verbindlich aus und speichert die Karte.
   *
   * Pro Eingabe ist genau ein Output ausgewählt. Eine bestehende Auswahl darf
   * geändert werden, solange der Output zur neuesten Eingabe der Karte gehört.
   */
  async acceptOutput(userId: string, outputId: number): Promise<CompetencyLlmOutput> {
    const { proofId, output } = await this.loadOwnOutput(userId, outputId);
    const proof = await this.assertOwnProof(userId, proofId);
    await this.assertSelectableOutput(proof, output);

    await this.db.transaction(async (tx) => {
      await tx
        .update(competencyLlmOutput)
        .set({ isSaved: false })
        .where(eq(competencyLlmOutput.competencyInputId, output.competencyInputId));
      await tx
        .update(competencyLlmOutput)
        .set({ isSaved: true })
        .where(eq(competencyLlmOutput.id, outputId));
      await tx
        .update(competencyProof)
        .set({ status: ProofStatus.Saved })
        .where(eq(competencyProof.id, proofId));
    });

    return { ...output, isSaved: true };
  }

  /** Verwirft eine Karte (Status: `discarded`). */
  async discardProof(userId: string, proofId: number): Promise<CompetencyProof> {
    await this.assertOwnProof(userId, proofId);
    await this.setProofStatus(proofId, ProofStatus.Discarded);
    return this.assertOwnProof(userId, proofId);
  }

  /**
   * Lädt die Kompetenz-Kette (Kompetenz → Bereich → Lehrgang) für den LLM-Kontext.
   */
  private async loadLlmContext(competencyId: number): Promise<LlmContext> {
    const [competency] = await this.db
      .select()
      .from(competencies)
      .where(eq(competencies.id, competencyId))
      .limit(1);
    if (!competency) {
      throw new NotFoundError('Kompetenz nicht gefunden');
    }

    const [area] = await this.db
      .select()
      .from(areas)
      .where(eq(areas.id, competency.areaId))
      .limit(1);
    if (!area) {
      throw new NotFoundError('Bereich nicht gefunden');
    }

    const [curriculumRow] = await this.db
      .select()
      .from(curriculum)
      .where(eq(curriculum.id, area.curriculumId))
      .limit(1);
    if (!curriculumRow) {
      throw new NotFoundError('Lehrgang nicht gefunden');
    }

    return {
      competency: { code: competency.code, description: competency.description },
      area: { code: area.code, titel: area.titel },
      curriculum: { code: curriculumRow.code, titel: curriculumRow.titel },
    };
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
          qualityStatement: result.qualityStatement,
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

  /** Verhindert Aktionen auf abgeschlossenen Karten oder überholten Revisionen. */
  private async assertCurrentOutput(
    proof: CompetencyProof,
    output: CompetencyLlmOutput,
    allowFailedRetry = false,
  ): Promise<void> {
    if (proof.status !== ProofStatus.LlmCheckFinished
      && !(allowFailedRetry && proof.status === ProofStatus.LlmCheckFailed)) {
      throw new ForbiddenError('Diese Auswertung kann im aktuellen Kartenstatus nicht verändert werden.');
    }
    const inputs = await this.db.select().from(competencyInput)
      .where(eq(competencyInput.competencyProofId, proof.id));
    const latestInput = inputs.reduce<typeof inputs[number] | undefined>(
      (latest, input) => !latest || input.id > latest.id ? input : latest, undefined,
    );
    const outputs = await this.db.select().from(competencyLlmOutput)
      .where(eq(competencyLlmOutput.competencyInputId, output.competencyInputId));
    if (latestInput?.id !== output.competencyInputId || outputs.some(item => item.id > output.id)) {
      throw new ForbiddenError('Die Auswertung ist nicht mehr aktuell. Bitte lade die Karte erneut.');
    }
  }

  /** Erlaubt die Auswahl jeder Revision der neuesten Eingabe, auch nach einer früheren Auswahl. */
  private async assertSelectableOutput(
    proof: CompetencyProof,
    output: CompetencyLlmOutput,
  ): Promise<void> {
    if (proof.status !== ProofStatus.LlmCheckFinished && proof.status !== ProofStatus.Saved) {
      throw new ForbiddenError('Diese Auswertung kann im aktuellen Kartenstatus nicht ausgewählt werden.');
    }
    const inputs = await this.db.select().from(competencyInput)
      .where(eq(competencyInput.competencyProofId, proof.id));
    const latestInput = inputs.reduce<typeof inputs[number] | undefined>(
      (latest, input) => !latest || input.id > latest.id ? input : latest, undefined,
    );
    if (latestInput?.id !== output.competencyInputId) {
      throw new ForbiddenError('Die Auswertung gehört nicht zur aktuellen Eingabe. Bitte lade die Karte erneut.');
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
