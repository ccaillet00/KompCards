import { generateObject } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';

import type { AppConfig } from '../config.js';

import { buildPrompt, SYSTEM_PROMPT } from './prompt.js';
import { llmOutputSchema } from './schema.js';
import type { LlmClient, LlmRequest, LlmResult } from './types.js';

// Manche Modelle liefern mehrere Hinweise als Liste. Nur diese verlustfreie
// Normalisierung erlauben; Domänenschema und Eval-Validierung bleiben strikt.
// Das an das Modell übermittelte JSON-Schema verlangt weiterhin String/null.
const responseSchema = llmOutputSchema.extend({
  note_improvment: z.preprocess((value) => {
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      return value.length === 0 ? null : value.join('\n');
    }
    return value;
  }, llmOutputSchema.shape.note_improvment),
});

/**
 * Konkreter LLM-Client auf Basis der Vercel AI SDK (provider-agnostisch).
 *
 * Verbindet sich mit dem **externen** LLM (separate Maschine) über eine
 * OpenAI-kompatible API. Endpoint, API-Key und Modell kommen ausschließlich
 * aus der Env-Konfiguration (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`).
 *
 * In Unit-Tests wird stattdessen ein Mock von `LlmClient` injiziert.
 */
export class OpenAiCompatibleLlmClient implements LlmClient {
  private readonly provider: ReturnType<typeof createOpenAICompatible>;

  constructor(
    private readonly config: Pick<AppConfig, 'llmBaseUrl' | 'llmApiKey' | 'llmModel'>,
  ) {
    this.provider = createOpenAICompatible({
      baseURL: config.llmBaseUrl,
      apiKey: config.llmApiKey,
      name: 'kompcards-llm',
    });
  }
  
  async generateCompetencyOutput(request: LlmRequest): Promise<LlmResult> {
    const { object } = await generateObject({
      model: this.provider(this.config.llmModel),
      schema: responseSchema,
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(request),
      temperature: 0.1,
      mode: 'json',
      maxTokens: 800,
    });

    return {
      workResult: object.work_result,
      quality: object.quality,
      qualityStatement: object.quality_statement,
      overlapCurriculum: object.overlap_curriculum,
      noteImprovment: object.note_improvment,
    };
  }
}
