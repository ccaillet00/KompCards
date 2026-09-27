import { createHash } from 'node:crypto';
import { z } from 'zod';
import { zodSchema } from 'ai';
import { buildPrompt } from '../llm/prompt.js';
import { llmOutputSchema } from '../llm/schema.js';
import type { LlmRequest } from '../llm/types.js';

const text = z.string().min(1);
const labelled = z.object({ code: text, titel: text }).strict();
const inputSchema = z.object({
  userRole: z.string(), what: text, how: text, why: text, environment: z.string(),
  subject: z.string().nullable(), userFeedback: z.string().nullable().optional(),
  context: z.object({ curriculum: labelled, area: labelled,
    competency: z.object({ code: text, description: text }).strict(),
  }).strict().optional(),
}).strict();
const caseSchema = z.object({
  id: text, split: z.enum(['development', 'holdout']), tags: z.array(text), input: inputSchema,
  expected: z.object({ quality: z.number().int().min(1).max(4), overlap_curriculum: z.boolean(),
    result_evidence: z.string().nullable(), quality_statement_semantics: text,
    must_preserve: z.array(text), must_not_invent: z.array(text),
    note_improvment_required: z.boolean(), note_topics: z.array(text),
  }).strict(),
});
const datasetSchema = z.object({ version: text, status: text, cases: z.array(caseSchema).min(1) }).passthrough();
export type Dataset = z.infer<typeof datasetSchema>;
export type EvalCase = z.infer<typeof caseSchema>;
export function parseDataset(value: unknown): Dataset {
  const data = datasetSchema.parse(value);
  if (new Set(data.cases.map(c => c.id)).size !== data.cases.length) throw new Error('Doppelte Fall-IDs');
  return data;
}

export function hash(value: string): string { return createHash('sha256').update(value).digest('hex'); }

export function loadEvalConfig(env: NodeJS.ProcessEnv) {
  const provider = z.enum(['vllm', 'openai-compatible', 'anthropic']).parse(env.EVAL_PROVIDER ?? 'vllm');
  const model = text.parse(env.LLM_MODEL);
  const baseUrl = text.parse(env.LLM_BASE_URL).replace(/\/$/, '');
  const url = new URL(baseUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('LLM_BASE_URL muss eine HTTP(S)-Basis-URL ohne Zugangsdaten, Query oder Fragment sein');
  }
  const apiKey = env.LLM_API_KEY ?? '';
  if (provider === 'anthropic' && !apiKey) throw new Error('LLM_API_KEY fehlt für Anthropic');
  const number = (key: string, fallback: number, max: number, min = 1) =>
    z.number().int().min(min).max(max).parse(Number(env[key] ?? fallback));
  const seed = env.EVAL_SEED === undefined ? undefined : number('EVAL_SEED', 0, 2147483647, 0);
  if (seed !== undefined && provider === 'anthropic') throw new Error('Anthropic unterstützt hier keinen Seed');
  const price = (key: string) => env[key] === undefined ? null : z.number().finite().nonnegative().parse(Number(env[key]));
  return {
    provider, model, baseUrl, apiKey,
    repetitions: number('EVAL_REPETITIONS', 3, 100),
    split: z.enum(['development', 'holdout', 'all']).parse(env.EVAL_SPLIT ?? 'development'),
    maxTokens: number('EVAL_MAX_TOKENS', 800, 65536),
    temperature: z.number().finite().min(0).max(provider === 'anthropic' ? 1 : 2).parse(Number(env.EVAL_TEMPERATURE ?? 0.1)),
    timeoutMs: number('EVAL_TIMEOUT_MS', 120000, 3600000), seed,
    prices: { input: price('EVAL_INPUT_USD_PER_MTOK'), output: price('EVAL_OUTPUT_USD_PER_MTOK'), cacheRead: price('EVAL_CACHE_READ_USD_PER_MTOK') },
    metadata: {
      weightsRevision: env.EVAL_WEIGHTS_REVISION ?? null, quantization: env.EVAL_QUANTIZATION ?? null,
      chatTemplateRevision: env.EVAL_CHAT_TEMPLATE_REVISION ?? null, vllmVersion: env.EVAL_VLLM_VERSION ?? null,
      imageDigest: env.EVAL_IMAGE_DIGEST ?? null, notes: env.EVAL_NOTES ?? null,
    },
  };
}
export type EvalConfig = ReturnType<typeof loadEvalConfig>;

// Same transport schema for all providers. Unsupported minLength constraints
// are omitted on the wire; the original strict Zod schema still validates output.
const wireSchema = llmOutputSchema.extend({
  work_result: z.string(), quality_statement: z.string(),
  quality: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
}).strict();
export const outputJsonSchema = zodSchema(wireSchema).jsonSchema;
export interface EvalRequest { url: string; body: Record<string, unknown> }
export function buildEvalRequest(config: EvalConfig, input: LlmRequest, system: string): EvalRequest {
  const common = { model: config.model, max_tokens: config.maxTokens, temperature: config.temperature, stream: false };
  const user = { role: 'user', content: buildPrompt(input) };
  if (config.provider === 'anthropic') {
    return { url: `${config.baseUrl}/messages`, body: { ...common, system, messages: [user],
      thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: outputJsonSchema } },
    } };
  }
  return { url: `${config.baseUrl}/chat/completions`, body: {
    ...common, messages: [{ role: 'system', content: system }, user],
    response_format: { type: 'json_schema', json_schema: { name: 'competency_card', strict: true, schema: outputJsonSchema } },
    ...(config.provider === 'vllm' ? { chat_template_kwargs: { enable_thinking: false } } : {}),
    ...(config.seed === undefined ? {} : { seed: config.seed }),
  } };
}

const usageEmpty = () => ({ input: null as number | null, output: null as number | null,
  cacheRead: null as number | null, cacheWrite: null as number | null, reasoning: null as number | null });
export interface ModelResponse {
  raw: string; text: string; finishReason: string | null; model: string | null;
  status: number | null; error: string | null; elapsedMs: number; usage: ReturnType<typeof usageEmpty>;
}
export interface EvalTransport {
  (url: string, init: RequestInit): Promise<Response>;
}
const obj = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const str = (value: unknown): string | null => typeof value === 'string' ? value : null;
const count = (value: unknown): number | null => typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
export function redact(value: string, secret: string): string { return secret ? value.split(secret).join('[REDACTED]') : value; }

export async function callModel(config: EvalConfig, request: EvalRequest, transport: EvalTransport = fetch): Promise<ModelResponse> {
  const start = performance.now();
  const result: ModelResponse = { raw: '', text: '', finishReason: null, model: null, status: null,
    error: null, elapsedMs: 0, usage: usageEmpty() };
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (config.provider === 'anthropic') {
      headers['x-api-key'] = config.apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;
    const response = await transport(request.url, { method: 'POST', headers, body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(config.timeoutMs), redirect: 'error' });
    result.status = response.status;
    result.raw = redact(await response.text(), config.apiKey);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = obj(JSON.parse(result.raw));
    result.model = str(data.model);
    const usage = obj(data.usage);
    if (config.provider === 'anthropic') {
      const content = Array.isArray(data.content) ? data.content : [];
      result.text = content.filter(v => obj(v).type === 'text').map(v => str(obj(v).text) ?? '').join('');
      result.finishReason = str(data.stop_reason);
      result.usage = { input: count(usage.input_tokens), output: count(usage.output_tokens),
        cacheRead: count(usage.cache_read_input_tokens), cacheWrite: count(usage.cache_creation_input_tokens), reasoning: null };
    } else {
      const choice = obj(Array.isArray(data.choices) ? data.choices[0] : null);
      result.text = str(obj(choice.message).content) ?? '';
      result.finishReason = str(choice.finish_reason);
      result.usage = { input: count(usage.prompt_tokens), output: count(usage.completion_tokens),
        cacheRead: count(obj(usage.prompt_tokens_details).cached_tokens), cacheWrite: null,
        reasoning: count(obj(usage.completion_tokens_details).reasoning_tokens) };
    }
    if (!result.text) result.error = 'Keine Textantwort';
  } catch (error) {
    result.error = redact(error instanceof Error ? `${error.name}: ${error.message}` : 'Unbekannter Transportfehler', config.apiKey);
  }
  result.elapsedMs = performance.now() - start;
  return result;
}

export function evaluateOutput(raw: string, card: EvalCase, finishReason: string | null) {
  let value: unknown;
  let jsonValid = true;
  try { value = JSON.parse(raw); } catch { jsonValid = false; }
  const parsed = llmOutputSchema.strict().safeParse(value);
  const output = parsed.success ? parsed.data : null;
  const words = (s: string) => s.trim() ? s.trim().split(/\s+/u).length : 0;
  const wordLimits = output !== null && words(output.work_result) <= 60 && words(output.quality_statement) <= 30;
  const qualityMatch = output !== null && output.quality === card.expected.quality;
  const overlapMatch = output !== null && output.overlap_curriculum === card.expected.overlap_curriculum;
  const notePresent = output !== null && (!card.expected.note_improvment_required || Boolean(output.note_improvment?.trim()));
  const completed = finishReason === 'stop' || finishReason === 'end_turn';
  return { jsonValid, schemaValid: parsed.success, output, wordLimits, qualityMatch, overlapMatch, notePresent, completed,
    automaticPass: parsed.success && wordLimits && qualityMatch && overlapMatch && notePresent && completed,
    errors: parsed.success ? [] : parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`),
  };
}

function cost(config: EvalConfig, usage: ModelResponse['usage']): number | null {
  const { input, output, cacheRead, cacheWrite } = usage;
  const price = config.prices;
  if (input === null || output === null || price.input === null || price.output === null) return null;
  if (config.provider === 'anthropic' && (cacheRead === null || cacheWrite === null)) return null;
  // Cache writes have duration-dependent pricing: do not invent an estimate.
  if ((cacheWrite ?? 0) > 0) return null;
  if ((cacheRead ?? 0) > 0 && price.cacheRead === null) return null;
  // OpenAI-compatible input includes cached tokens; Anthropic input excludes them.
  if (config.provider !== 'anthropic' && cacheRead === null) return null;
  const regularInput = config.provider === 'anthropic' ? input : input - (cacheRead ?? 0);
  if (regularInput < 0) return null;
  return (regularInput * price.input + output * price.output + (cacheRead ?? 0) * (price.cacheRead ?? 0)) / 1e6;
}
export interface Attempt {
  id: string; caseId: string; repeat: number; split: EvalCase['split']; tags: string[];
  curriculum: string; missingContext: boolean; timestamp: string;
  request: EvalRequest; response: ModelResponse; grade: ReturnType<typeof evaluateOutput>; costUsd: number | null;
}
export function selectedCases(config: EvalConfig, dataset: Dataset) {
  const cases = dataset.cases.filter(c => config.split === 'all' || config.split === c.split);
  if (!cases.length) throw new Error('Keine Fälle im gewählten Split');
  return cases;
}
export async function* runEvaluation(config: EvalConfig, dataset: Dataset, system: string, transport: EvalTransport = fetch): AsyncGenerator<Attempt> {
  const cases = selectedCases(config, dataset);
  // Repeat in rounds, not three consecutive calls of the same case.
  for (let repeat = 1; repeat <= config.repetitions; repeat++) {
    for (const card of cases) {
      const request = buildEvalRequest(config, card.input, system);
      const timestamp = new Date().toISOString();
      const response = await callModel(config, request, transport);
      yield { id: `${card.id}::${repeat}`, caseId: card.id, repeat, split: card.split, tags: card.tags,
        curriculum: card.input.context?.curriculum.titel ?? 'Kontext fehlt', missingContext: !card.input.context,
        timestamp, request, response, grade: evaluateOutput(response.text, card, response.finishReason), costUsd: cost(config, response.usage) };
    }
  }
}

const score = z.number().int().min(0).max(2).nullable();
const reviewSchema = z.object({ attemptId: text, reviewer: z.string(),
  scores: z.object({ facts: score, action: score, grammar: score, outcome: score, improvements: score }).strict(),
  criticalErrors: z.array(text).nullable(), notes: z.string(),
}).strict();
export type Review = z.infer<typeof reviewSchema>;
export function parseReviews(value: unknown): Review[] {
  const reviews = z.array(reviewSchema).parse(value);
  if (new Set(reviews.map(r => r.attemptId)).size !== reviews.length) throw new Error('Doppelte Review-IDs');
  return reviews;
}
export function emptyReview(row: Attempt): Review {
  return { attemptId: row.id, reviewer: '', scores: { facts: null, action: null, grammar: null, outcome: null, improvements: null }, criticalErrors: null, notes: '' };
}
const complete = (review: Review | undefined): review is Review => Boolean(review?.reviewer.trim() && review.criticalErrors !== null && Object.values(review.scores).every(s => s !== null));
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? null;
};
export function summarize(rows: Attempt[], reviews: Review[]) {
  const ids = new Set(rows.map(r => r.id));
  if (ids.size !== rows.length) throw new Error('Doppelte Attempt-IDs');
  if (reviews.some(r => !ids.has(r.attemptId))) throw new Error('Review verweist auf unbekannten Versuch');
  const reviewById = new Map(reviews.map(r => [r.attemptId, r]));
  const reviewed = rows.filter(r => complete(reviewById.get(r.id)));
  const passed = (r: Attempt) => {
    const review = reviewById.get(r.id);
    return r.grade.automaticPass && !r.response.error && complete(review) && review.criticalErrors!.length === 0 && Object.values(review.scores).every(s => s === 2);
  };
  const groups = [...new Set(rows.map(r => r.caseId))].map(id => rows.filter(r => r.caseId === id));
  const knownCost = rows.filter(r => r.costUsd !== null);
  return {
    attempts: rows.length, cases: groups.length,
    schemaValid: rows.filter(r => r.grade.schemaValid).length,
    automaticPass: rows.filter(r => r.grade.automaticPass && !r.response.error).length,
    qualityMatches: rows.filter(r => r.grade.qualityMatch).length,
    overlapMatches: rows.filter(r => r.grade.overlapMatch).length,
    transportErrors: rows.filter(r => r.response.error).length,
    incomplete: rows.filter(r => !r.grade.completed).length,
    reviewed: reviewed.length,
    success: reviewed.length ? reviewed.filter(passed).length : null,
    criticalErrors: reviewed.length ? reviewed.filter(r => reviewById.get(r.id)!.criticalErrors!.length > 0).length : null,
    meanSemanticScore: reviewed.length ? reviewed.reduce((sum, r) => sum + Object.values(reviewById.get(r.id)!.scores).reduce<number>((s, n) => s + (n ?? 0), 0), 0) / reviewed.length : null,
    consistentCases: reviewed.length ? groups.filter(group => group.every(passed)).length : null,
    p50Ms: percentile(rows.map(r => r.response.elapsedMs), 0.5), p95Ms: percentile(rows.map(r => r.response.elapsedMs), 0.95),
    costKnownAttempts: knownCost.length,
    costUsd: rows.length && knownCost.length === rows.length ? knownCost.reduce((sum, r) => sum + r.costUsd!, 0) : null,
    knownCostSubtotalUsd: knownCost.reduce((sum, r) => sum + r.costUsd!, 0),
  };
}
