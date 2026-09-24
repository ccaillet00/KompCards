import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Attempt } from '../src/eval/core.js';
import {
  loadEvalConfig, parseDataset, buildEvalRequest, evaluateOutput,
  callModel, runEvaluation, summarize, parseReviews,
} from '../src/eval/core.js';

const dataset = () => parseDataset(JSON.parse(readFileSync('../docs/evals/competency-cards.v0.1.json', 'utf8')));
const env = { EVAL_PROVIDER: 'vllm', LLM_BASE_URL: 'http://localhost:8000/v1', LLM_MODEL: 'test-model' };
const config = () => loadEvalConfig(env);
const card = () => dataset().cases[0]!;
const answer = {
  work_result: 'Ich habe eine Passwort-Zurücksetzung mit Tokenprüfung implementiert, um den Zugang wieder zu ermöglichen.',
  quality: 4, quality_statement: 'Alle acht definierten Testfälle haben bestanden.',
  overlap_curriculum: true, note_improvment: null,
};
const response = (finish = 'stop') => new Response(JSON.stringify({
  model: 'resolved-model', choices: [{ message: { content: JSON.stringify(answer) }, finish_reason: finish }],
  usage: { prompt_tokens: 100, completion_tokens: 40, prompt_tokens_details: { cached_tokens: 0 } },
}));

describe('eval configuration and dataset', () => {
  it('validates numbers, credentials and provider-specific settings before calls', () => {
    expect(config()).toMatchObject({ repetitions: 3, split: 'development', maxTokens: 800, temperature: 0.1 });
    for (const value of ['NaN', '-1', '1.5', '0']) {
      expect(() => loadEvalConfig({ ...env, EVAL_REPETITIONS: value })).toThrow();
    }
    expect(() => loadEvalConfig({ ...env, LLM_BASE_URL: 'http://user:secret@localhost/v1' })).toThrow();
    expect(() => loadEvalConfig({ ...env, EVAL_PROVIDER: 'anthropic' })).toThrow();
    expect(() => loadEvalConfig({ ...env, EVAL_PROVIDER: 'anthropic', LLM_API_KEY: 'key', EVAL_SEED: '5' })).toThrow();
  });
  it('loads all 30 keyword cases and rejects duplicate ids or invalid inputs', () => {
    const data = dataset();
    expect(data.cases).toHaveLength(30);
    expect(data.cases.filter(c => c.split === 'holdout')).toHaveLength(10);
    expect(() => parseDataset({ ...data, cases: [card(), card()] })).toThrow();
    expect(() => parseDataset({ ...data, cases: [{ ...card(), input: { what: 'test' } }] })).toThrow();
  });
});

describe('eval provider adapters', () => {
  it('sends only input, current prompt and schema to vLLM; disables thinking', () => {
    const req = buildEvalRequest(config(), card().input, 'system-rules');
    expect(req.url).toBe('http://localhost:8000/v1/chat/completions');
    expect(req.body).toMatchObject({ temperature: 0.1, max_tokens: 800, chat_template_kwargs: { enable_thinking: false }, response_format: { type: 'json_schema' } });
    expect(JSON.stringify(req.body)).toContain('system-rules');
    expect(JSON.stringify(req.body)).not.toContain('must_not_invent');
    expect(JSON.stringify(req.body)).not.toContain('quality_statement_semantics');
  });
  it('uses native Anthropic structured output without unsupported numerical/string limits', () => {
    const c = loadEvalConfig({ ...env, EVAL_PROVIDER: 'anthropic', LLM_BASE_URL: 'https://api.anthropic.com/v1', LLM_API_KEY: 'secret' });
    const req = buildEvalRequest(c, card().input, 'rules');
    expect(req.url).toBe('https://api.anthropic.com/v1/messages');
    expect(req.body).toMatchObject({ system: 'rules', thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema' } } });
    expect(req.body).not.toHaveProperty('chat_template_kwargs');
    expect(JSON.stringify(req.body)).not.toMatch(/minLength|minimum|maximum/);
    expect(JSON.stringify(req.body)).not.toContain('secret');
  });
  it('extracts model, stop reason, tokens and full response from vLLM', async () => {
    const fetcher = vi.fn(async () => response());
    const result = await callModel(config(), buildEvalRequest(config(), card().input, 'rules'), fetcher);
    expect(result).toMatchObject({ text: JSON.stringify(answer), finishReason: 'stop', model: 'resolved-model', usage: { input: 100, output: 40, cacheRead: 0, reasoning: null } });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('extracts Anthropic cache counters separately and never treats unknown reasoning as zero', async () => {
    const c = loadEvalConfig({ ...env, EVAL_PROVIDER: 'anthropic', LLM_API_KEY: 'key' });
    const result = await callModel(c, buildEvalRequest(c, card().input, 'rules'), async () => new Response(JSON.stringify({
      model: 'haiku-snapshot', content: [{ type: 'text', text: JSON.stringify(answer) }], stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 20, cache_creation_input_tokens: 10 },
    })));
    expect(result.usage).toEqual({ input: 100, output: 50, cacheRead: 20, cacheWrite: 10, reasoning: null });
  });
  it('preserves HTTP failures without leaking keys and does not retry', async () => {
    const c = loadEvalConfig({ ...env, LLM_API_KEY: 'private-key' });
    const fetcher = vi.fn(async () => new Response('private-key: busy', { status: 429 }));
    const result = await callModel(c, buildEvalRequest(c, card().input, 'rules'), fetcher);
    expect(result.error).toContain('429');
    expect(JSON.stringify(result)).not.toContain('private-key');
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('records timeout instead of dropping the attempt', async () => {
    const result = await callModel(config(), buildEvalRequest(config(), card().input, 'rules'), async () => { throw new DOMException('timeout', 'TimeoutError'); });
    expect(result.error).toContain('TimeoutError');
    expect(result.usage.input).toBeNull();
  });
});

describe('automatic grading', () => {
  it('accepts valid output but leaves semantic judgement for review', () => {
    const grade = evaluateOutput(JSON.stringify(answer), card(), 'stop');
    expect(grade).toMatchObject({ schemaValid: true, automaticPass: true, qualityMatch: true, overlapMatch: true });
    expect(grade).not.toHaveProperty('factuallyCorrect');
  });
  it('rejects invalid JSON, extra properties, out-of-range ratings, long text and truncation', () => {
    expect(evaluateOutput('```json\n{}\n```', card(), 'stop').jsonValid).toBe(false);
    expect(evaluateOutput(JSON.stringify({ ...answer, extra: true }), card(), 'stop').schemaValid).toBe(false);
    expect(evaluateOutput(JSON.stringify({ ...answer, quality: 5 }), card(), 'stop').schemaValid).toBe(false);
    expect(evaluateOutput(JSON.stringify({ ...answer, work_result: 'Wort '.repeat(61) }), card(), 'stop').automaticPass).toBe(false);
    expect(evaluateOutput(JSON.stringify(answer), card(), 'length').automaticPass).toBe(false);
    expect(evaluateOutput(JSON.stringify(answer), card(), 'refusal').automaticPass).toBe(false);
  });
});

describe('repeat runs and reports', () => {
  it('filters splits, repeats in rounds and retains all failed attempts in the denominator', async () => {
    const data = { ...dataset(), cases: [card(), dataset().cases[20]!] };
    const fetcher = vi.fn().mockResolvedValueOnce(response()).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response('length'));
    const rows: Attempt[] = [];
    for await (const row of runEvaluation(config(), data, 'rules', fetcher)) rows.push(row);
    expect(rows.map(r => r.repeat)).toEqual([1, 2, 3]);
    expect(fetcher).toHaveBeenCalledTimes(3);
    const report = summarize(rows, []);
    expect(report).toMatchObject({ attempts: 3, automaticPass: 1, reviewed: 0, success: null, criticalErrors: null });
    expect(report.costUsd).toBeNull();
  });
  it('requires complete human review, counts critical errors and measures repeat consistency', async () => {
    const rows: Attempt[] = [];
    for await (const row of runEvaluation({ ...config(), repetitions: 1 }, { ...dataset(), cases: [card()] }, 'rules', async () => response())) rows.push(row);
    const review = { attemptId: rows[0]!.id, reviewer: 'Reviewer', scores: { facts: 2, action: 2, grammar: 2, outcome: 2, improvements: 2 }, criticalErrors: [], notes: '' };
    expect(summarize(rows, parseReviews([review]))).toMatchObject({ reviewed: 1, success: 1, criticalErrors: 0, consistentCases: 1 });
    expect(summarize(rows, parseReviews([{ ...review, criticalErrors: ['invented_evidence'] }]))).toMatchObject({ success: 0, criticalErrors: 1 });
    expect(() => parseReviews([review, review])).toThrow();
    expect(() => parseReviews([{ ...review, scores: { ...review.scores, facts: 3 } }])).toThrow();
    expect(() => summarize(rows, parseReviews([{ ...review, attemptId: 'unknown' }]))).toThrow();
  });
  it('calculates supplied token prices, keeps failed costs unknown and never treats missing cache usage as zero', async () => {
    const priced = loadEvalConfig({ ...env, EVAL_REPETITIONS: '1', EVAL_INPUT_USD_PER_MTOK: '1', EVAL_OUTPUT_USD_PER_MTOK: '5' });
    const rows: Attempt[] = [];
    for await (const row of runEvaluation(priced, { ...dataset(), cases: [card()] }, 'rules', async () => response())) rows.push(row);
    expect(rows[0]!.costUsd).toBeCloseTo(0.0003);
    const anthropic = loadEvalConfig({ ...env, EVAL_PROVIDER: 'anthropic', LLM_API_KEY: 'key', EVAL_REPETITIONS: '1', EVAL_INPUT_USD_PER_MTOK: '1', EVAL_OUTPUT_USD_PER_MTOK: '5' });
    const missing: Attempt[] = [];
    for await (const row of runEvaluation(anthropic, { ...dataset(), cases: [card()] }, 'rules', async () => new Response(JSON.stringify({
      content: [{ type: 'text', text: JSON.stringify(answer) }], stop_reason: 'end_turn', usage: { input_tokens: 100, output_tokens: 40 },
    })))) missing.push(row);
    expect(missing[0]!.costUsd).toBeNull();
    expect(summarize([...rows, { ...missing[0]!, id: 'other::1', caseId: 'other' }], []).costUsd).toBeNull();
  });
});
