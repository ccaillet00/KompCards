import { generateObject } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

import type { AppConfig } from '../config.js';

import { buildPrompt, SYSTEM_PROMPT } from './prompt.js';
import { llmOutputSchema } from './schema.js';
import type { LlmClient, LlmRequest, LlmResult } from './types.js';

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
      schema: llmOutputSchema,
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(request),
    });

    return {
      workResult: object.work_result,
      quality: object.quality,
      overlapCurriculum: object.overlap_curriculum,
      noteImprovment: object.note_improvment,
    };
  }
}
