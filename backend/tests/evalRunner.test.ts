import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { main } from '../src/eval/cli.js';

const dirs: string[] = [];
const env = { EVAL_PROVIDER: 'vllm', LLM_BASE_URL: 'http://localhost:8000/v1', LLM_MODEL: 'fake', EVAL_REPETITIONS: '1' };
const smallDataset = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kompcards-eval-test-')); dirs.push(dir);
  const dataset = JSON.parse(await readFile('../docs/evals/competency-cards.v0.1.json', 'utf8'));
  dataset.cases = dataset.cases.slice(0, 1);
  const path = join(dir, 'dataset.json');
  await writeFile(path, JSON.stringify(dataset));
  return { dir, path, out: join(dir, 'run') };
};
afterEach(async () => { await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });
const output = { work_result: 'Ich habe eine Passwort-Zurücksetzung mit Tokenprüfung implementiert, um den Zugang wieder zu ermöglichen.', quality_statement: 'Alle acht definierten Testfälle haben bestanden.', quality: 4, overlap_curriculum: true, note_improvment: null };
const fakeFetch = () => vi.fn(async () => new Response(JSON.stringify({ model: 'fake', choices: [{ message: { content: JSON.stringify(output) }, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 20, prompt_tokens_details: { cached_tokens: 0 } } })));

describe('eval command', () => {
  it('shows help without credentials or model calls and rejects unknown options', async () => {
    const fetcher = fakeFetch(); const log = vi.fn();
    expect(await main(['--help'], {}, fetcher, log)).toBe(0);
    expect(log).toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
    await expect(main(['--rn'], {}, fetcher, log)).rejects.toThrow();
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
    expect(await main(['--run', '--dataset', path, '--out', out], env, async () => new Response('busy', { status: 503 }), () => {})).toBe(2);
    const summary = JSON.parse(await readFile(join(out, 'summary.json'), 'utf8'));
    expect(summary.total).toMatchObject({ attempts: 1, transportErrors: 1, automaticPass: 0 });
    expect(JSON.parse(await readFile(join(out, 'manifest.json'), 'utf8')).status).toBe('completed');
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
