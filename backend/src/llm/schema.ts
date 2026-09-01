import { z } from 'zod';

/**
 * Zod-Schema für den **strukturierten LLM-Output**.
 *
 * Das externe LLM liefert exakt diese Felder (siehe docs/ARCHITECTURE.md §5):
 * - `work_result` — der erzeugte Output
 * - `quality` (1–4) — LLM-seitig gesetzt
 * - `overlap_curriculum` — LLM-seitig gesetzt
 * - `note_improvment` — Verbesserungshinweise (Tippfehler im Namen wird beibehalten)
 */
export const llmOutputSchema = z.object({
  /** work result output from LLM */
  work_result: z.string().min(1),
  /** 1=very bad, 2=bad, 3=good, 4=very good (LLM-seitig gesetzt) */
  quality: z.number().int().min(1).max(4),
  /** Does the Output overlap with the curriculum (LLM-seitig gesetzt) */
  overlap_curriculum: z.boolean(),
  /** Note improvments from the LLM (optional) */
  note_improvment: z.string().nullable(),
});

export type LlmOutput = z.infer<typeof llmOutputSchema>;
