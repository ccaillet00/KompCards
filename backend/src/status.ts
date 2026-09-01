/**
 * Domänen-Konstanten für `competency_proof.status` und `competency_llm_output.quality`.
 *
 * Single Source of Truth ist `SQL/create_tables.sql`; hier wird das Domänen-Wissen
 * zusätzlich als Typen/Konstanten gespiegelt (siehe docs/PROJECT.md, ADR-006).
 */

/**
 * Status einer Kompetenzkarte (`competency_proof.status`).
 *
 * **Nur 1–6 gelten** (ADR-006). Das SQL-`CHECK` erlaubt formal bis 10;
 * die Werte 7–10 sind eine ungenutzte Lücke und werden nicht verwendet.
 */
export const ProofStatus = {
  /** 1 — Entwurf. */
  Draft: 1,
  /** 2 — LLM-Prüfung läuft. */
  LlmCheck: 2,
  /** 3 — LLM-Prüfung fehlgeschlagen. */
  LlmCheckFailed: 3,
  /** 4 — LLM-Prüfung abgeschlossen. */
  LlmCheckFinished: 4,
  /** 5 — gespeichert. */
  Saved: 5,
  /** 6 — verworfen. */
  Discarded: 6,
} as const;

export type ProofStatusValue = (typeof ProofStatus)[keyof typeof ProofStatus];

/** Gültige Status-Werte (1–6). */
export const VALID_PROOF_STATUSES: readonly number[] = Object.values(ProofStatus);

/**
 * Qualität des Nutzeingangs (`competency_llm_output.quality`), LLM-seitig gesetzt.
 * 1=very bad, 2=bad, 3=good, 4=very good.
 */
export const OutputQuality = {
  VeryBad: 1,
  Bad: 2,
  Good: 3,
  VeryGood: 4,
} as const;

export type OutputQualityValue = (typeof OutputQuality)[keyof typeof OutputQuality];

/** Gültige Quality-Werte (1–4). */
export const VALID_QUALITIES: readonly number[] = Object.values(OutputQuality);
