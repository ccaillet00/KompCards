/**
 * Kontext: Kompetenz, Bereich und Lehrgang, auf die sich das Arbeitsergebnis bezieht.
 */
export interface LlmContext {
  competency: { code: string; description: string };
  area: { code: string; titel: string };
  curriculum: { code: string; titel: string };
}

/**
 * Eingabe für einen LLM-Call — die strukturierte Kompetenz-Eingabe
 * (`competency_input`) plus optionalem Feedback für einen Retry.
 */
export interface LlmRequest {
  /** What role does the student play within the company? */
  userRole: string;
  /** The 'what' in the exercise of competence */
  what: string;
  /** The 'how' in the exercise of competence */
  how: string;
  /** The 'why' behind the exercise of competence */
  why: string;
  /** Where was this plot carried out? */
  environment: string;
  /** The lecturer's requests (optional) */
  subject: string | null;
  /** Optionales Feedback für einen Retry (Revision). */
  userFeedback?: string | null;
  /** Kontext: Kompetenz, Bereich, Lehrgang (wird oben im Prompt gerendert). */
  context?: LlmContext;
}

/**
 * Ergebnis eines LLM-Calls — entspricht dem validierten `llmOutputSchema`,
 * in Domänen-Form (camelCase) für die Services.
 */
export interface LlmResult {
  /** work result output from LLM */
  workResult: string;
  /** 1=very bad, 2=bad, 3=good, 4=very good */
  quality: number;
  /** Qualitative Aussage des LLMs zur Qualität des Arbeitsergebnisses */
  qualityStatement: string;
  /** Does the Output overlap with the curriculum */
  overlapCurriculum: boolean;
  /** Note improvments from the LLM */
  noteImprovment: string | null;
}

/**
 * Interface für den LLM-Client.
 *
 * Der konkrete Client (Vercel AI SDK) steht **hinter** diesem Interface und wird
 * in Unit-Tests **gemockt** (deterministisch, kein echter LLM-Call).
 */
export interface LlmClient {
  generateCompetencyOutput(request: LlmRequest): Promise<LlmResult>;
}
