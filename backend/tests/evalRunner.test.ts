import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { main } from '../src/eval/cli.js';

const dirs: string[] = [];
const env = { EVAL_PROVIDER: 'vllm', LLM_BASE_URL: 'http://localhost:8000/v1', LLM_MODEL: 'fake', EVAL_REPETITIONS: '1' };
const smallDataset = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kompcards-eval-test-')); dirs.push(dir);
  const dataset = JSON.parse(await readFile('../docs/evals/competency-cards.v0.2.json', 'utf8'));
  dataset.cases = dataset.cases.slice(0, 1);
  const path = join(dir, 'dataset.json');
  await writeFile(path, JSON.stringify(dataset));
  return { dir, path, out: join(dir, 'run') };
};
afterEach(async () => { await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });
const output = { work_result: 'Ich habe eine Passwort-Zurücksetzung mit Tokenprüfung implementiert, um den Zugang wieder zu ermöglichen.', quality_statement: 'Alle acht definierten Testfälle haben bestanden.', quality: 4, overlap_curriculum: true, note_improvment: null };
const fakeFetch = () => vi.fn(async () => new Response(JSON.stringify({ model: 'fake', choices: [{ message: { content: JSON.stringify(output) }, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 20, prompt_tokens_details: { cached_tokens: 0 } } })));

describe('eval command', () => {
  it('uses dataset v0.2 by default and plans all Wozu development cases without calls', async () => {
    const { out } = await smallDataset(); const fetcher = fakeFetch();
    await main(['--dry-run', '--out', out], env, fetcher, () => {});
    expect(fetcher).not.toHaveBeenCalled();
    expect(JSON.parse(await readFile(join(out, 'manifest.json'), 'utf8'))).toMatchObject({ datasetVersion: '0.2.0-draft', plannedAttempts: 23 });
    const plan = JSON.parse(await readFile(join(out, 'plan.json'), 'utf8'));
    expect(plan.filter((row: { caseId: string }) => row.caseId.startsWith('wozu-'))).toHaveLength(3);
  });
  it('shows help without credentials or model calls and rejects unknown options', async () => {
    const fetcher = fakeFetch(); const log = vi.fn();
    expect(await main(['--help'], {}, fetcher, log)).toBe(0);
    expect(log).toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
    await expect(main(['--rn'], {}, fetcher, log)).rejects.toThrow();
  });
  it('defaults to the SDK client and plans the actual SDK request without contacting the endpoint', async () => {
    const { path, out } = await smallDataset(); const fetcher = fakeFetch();
    await main(['--dry-run', '--dataset', path, '--out', out], env, fetcher, () => {});
    expect(fetcher).not.toHaveBeenCalled();
    const manifest = JSON.parse(await readFile(join(out, 'manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({ configuration: { execution: 'client', timeoutMs: null }, protocol: { execution: 'client', retries: 'sdk-default', thinking: 'provider-default' } });
    expect(manifest.hashes.client).toEqual(expect.any(String));
    const plan = JSON.parse(await readFile(join(out, 'plan.json'), 'utf8'));
    expect(plan[0].request.body).not.toHaveProperty('chat_template_kwargs');
    expect(plan[0].request.body.response_format.type).toBe('json_schema');
    expect(JSON.parse(await readFile(join(out, 'output-schema.json'), 'utf8'))).toEqual(plan[0].request.body.response_format.json_schema.schema);
  });

  it('rejects client settings that would differ from production instead of silently ignoring them', async () => {
    const fetcher = fakeFetch();
    for (const overrides of [{ EVAL_TEMPERATURE: '0.7' }, { EVAL_MAX_TOKENS: '1000' }, { EVAL_SEED: '42' }, { EVAL_TIMEOUT_MS: '5000' }, { EVAL_TIMEOUT_MS: '120000' }, { EVAL_PROVIDER: 'anthropic', LLM_API_KEY: 'key' }]) {
      await expect(main(['--dry-run'], { ...env, ...overrides }, fetcher, () => {})).rejects.toThrow(/Client-Modus/);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('defaults to a dry-run, writes a reproducible plan and never persists the API key', async () => {
    const { path, out } = await smallDataset(); const fetcher = fakeFetch();
    expect(await main(['--dataset', path, '--out', out], { ...env, LLM_API_KEY: 'sensitive-key' }, fetcher, () => {})).toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
    const manifest = await readFile(join(out, 'manifest.json'), 'utf8');
    expect(manifest).not.toContain('sensitive-key');
    expect(JSON.parse(manifest)).toMatchObject({ status: 'dry-run', plannedAttempts: 1 });
    expect(await readFile(join(out, 'system-prompt.txt'), 'utf8')).toContain('WORK_RESULT');
    const plan = await readFile(join(out, 'plan.json'), 'utf8');
    expect(plan).not.toContain('must_not_invent');
    await expect(main(['--dataset', path, '--out', out], env, fetcher, () => {})).rejects.toThrow();
  });
  it('runs with a mocked endpoint, emits pending reviews and re-reports without network access', async () => {
    const { path, out } = await smallDataset(); const fetcher = fakeFetch();
    expect(await main(['--run', '--dataset', path, '--out', out], env, fetcher, () => {})).toBe(0);
    expect(fetcher).toHaveBeenCalledOnce();
    const summary = JSON.parse(await readFile(join(out, 'summary.json'), 'utf8'));
    expect(summary.total).toMatchObject({ attempts: 1, reviewed: 0, success: null });
    const reviews = JSON.parse(await readFile(join(out, 'reviews.json'), 'utf8'));
    reviews.reviews[0] = { ...reviews.reviews[0], reviewer: 'Human', scores: { facts: 2, action: 2, grammar: 2, outcome: 2, improvements: 2 }, criticalErrors: [] };
    await writeFile(join(out, 'reviews.json'), JSON.stringify(reviews));
    const noNetwork = vi.fn();
    expect(await main(['--report', out], {}, noNetwork, () => {})).toBe(0);
    expect(noNetwork).not.toHaveBeenCalled();
    const updated = JSON.parse(await readFile(join(out, 'summary.json'), 'utf8'));
    expect(updated.total).toMatchObject({ reviewed: 1, success: 1, consistentCases: 1 });
    expect(await readFile(join(out, 'report.md'), 'utf8')).toContain('Fachlich');
  });
  it('keeps HTTP failures in results, creates a report and returns failure status', async () => {
    const { path, out } = await smallDataset();
    expect(await main(['--run', '--dataset', path, '--out', out], env, async () => new Response('not found', { status: 404 }), () => {})).toBe(2);
    const summary = JSON.parse(await readFile(join(out, 'summary.json'), 'utf8'));
    expect(summary.total).toMatchObject({ attempts: 1, transportErrors: 1, automaticPass: 0 });
    expect(JSON.parse(await readFile(join(out, 'manifest.json'), 'utf8')).status).toBe('completed');
  });
  it('re-reports the client-normalized output while preserving raw schema failures and HTTP traces', async () => {
    const { path, out } = await smallDataset();
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      id: 'normalization-test', created: 0, model: 'fake',
      choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify({ ...output, note_improvment: ['Relevanter Hinweis.'] }) }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 100, completion_tokens: 20 },
    }), { headers: { 'Content-Type': 'application/json' } }));
    expect(await main(['--run', '--dataset', path, '--out', out], env, fetcher, () => {})).toBe(0);
    const row = JSON.parse((await readFile(join(out, 'results.jsonl'), 'utf8')).trim());
    expect(row.response.httpAttempts).toHaveLength(1);
    expect(row.response.text).toContain('["Relevanter Hinweis."]');
    expect(JSON.parse(row.response.validatedText).note_improvment).toBe('Relevanter Hinweis.');
    expect(await main(['--report', out], {}, vi.fn(), () => {})).toBe(0);
    const summary = JSON.parse(await readFile(join(out, 'summary.json'), 'utf8'));
    expect(summary).toMatchObject({ execution: 'client', rawSchemaValid: 0, httpAttempts: 1, retriesObserved: 0,
      total: { schemaValid: 1, automaticPass: 1 } });
  });
  it('rejects review files belonging to another run', async () => {
    const { path, out } = await smallDataset();
    await main(['--run', '--dataset', path, '--out', out], env, fakeFetch(), () => {});
    const reviews = JSON.parse(await readFile(join(out, 'reviews.json'), 'utf8'));
    reviews.runId = 'another-run';
    await writeFile(join(out, 'reviews.json'), JSON.stringify(reviews));
    await expect(main(['--report', out], {}, fakeFetch(), () => {})).rejects.toThrow('Run-ID');
  });
});
