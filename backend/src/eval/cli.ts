import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { SYSTEM_PROMPT } from '../llm/prompt.js';
import {
  buildEvalRequest, emptyReview, evaluateOutput, hash, loadEvalConfig, outputJsonSchema,
  parseDataset, parseReviews, redact, runEvaluation, selectedCases, summarize,
} from './core.js';
import type { Attempt, Dataset, EvalTransport, Review } from './core.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const HELP = `KompCards Eval (Bun, separat von Vitest)
  bun run eval --dry-run [--dataset PATH] [--out DIRECTORY] [--prompt PATH]
  bun run eval --run     [--dataset PATH] [--out DIRECTORY] [--prompt PATH]
  bun run eval --report DIRECTORY

Ohne Modus: dry-run (keine API-Aufrufe). --run erzeugt kostenpflichtige API-Aufrufe.
Env: LLM_BASE_URL (inkl. /v1), LLM_MODEL, LLM_API_KEY (bei Anthropic Pflicht).
EVAL_PROVIDER=vllm|openai-compatible|anthropic (Default vllm)
EVAL_SPLIT=development|holdout|all (Default development)
EVAL_REPETITIONS=3 EVAL_TEMPERATURE=0.1 EVAL_MAX_TOKENS=800 EVAL_TIMEOUT_MS=120000
Optionale Preise/Metadaten: siehe docs/evals/RUNNER.md.
Exit: 0 = erfolgreich ausgeführt/automatische Kriterien erfüllt, fachliche Prüfung ggf. offen;
      2 = automatische/fachliche Fehler oder unvollständiger Lauf; 1 = Konfigurations-/Dateifehler.`;

function options(args: string[]) {
  const opts: { mode: 'dry-run' | 'run' | 'report'; out?: string; dataset?: string; prompt?: string; report?: string; help: boolean } = { mode: 'dry-run', help: false };
  let modeSet = false;
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (seen.has(arg)) throw new Error(`Doppelte Option: ${arg}`);
    seen.add(arg);
    if (arg === '--help') { opts.help = true; continue; }
    if (arg === '--run' || arg === '--dry-run' || arg === '--report') {
      if (modeSet) throw new Error('Nur ein Modus pro Aufruf');
      modeSet = true;
      opts.mode = arg.slice(2) as typeof opts.mode;
      if (arg !== '--report') continue;
    }
    if (!['--out', '--dataset', '--prompt', '--report'].includes(arg)) throw new Error(`Unbekannte Option: ${arg}`);
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(`Wert fehlt für ${arg}`);
    if (arg === '--out') opts.out = resolve(value);
    if (arg === '--dataset') opts.dataset = resolve(value);
    if (arg === '--prompt') opts.prompt = resolve(value);
    if (arg === '--report') opts.report = resolve(value);
  }
  if (opts.mode === 'report' && (opts.out || opts.dataset || opts.prompt)) throw new Error('--report verwendet ausschliesslich die gespeicherten Laufdaten');
  return opts;
}
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const manifestSchema = z.object({
  runId: z.string(), createdAt: z.string(), status: z.enum(['dry-run', 'running', 'completed', 'interrupted']),
  plannedAttempts: z.number().int().nonnegative(), completedAttempts: z.number().int().nonnegative(),
  hashes: z.object({ dataset: z.string(), prompt: z.string(), rubric: z.string(), core: z.string(), cli: z.string() }),
  configuration: z.object({ model: z.string(), provider: z.string() }).passthrough(),
}).passthrough();
type Manifest = z.infer<typeof manifestSchema>;

const nullableCount = z.number().int().nonnegative().nullable();
const storedAttemptSchema = z.object({
  id: z.string(), caseId: z.string(), repeat: z.number().int().positive(),
  split: z.enum(['development', 'holdout']), tags: z.array(z.string()), curriculum: z.string(), missingContext: z.boolean(), timestamp: z.string(),
  request: z.object({ url: z.string(), body: z.record(z.unknown()) }),
  response: z.object({ raw: z.string(), text: z.string(), finishReason: z.string().nullable(), model: z.string().nullable(),
    status: z.number().nullable(), error: z.string().nullable(), elapsedMs: z.number().nonnegative(),
    usage: z.object({ input: nullableCount, output: nullableCount, cacheRead: nullableCount, cacheWrite: nullableCount, reasoning: nullableCount }),
  }), costUsd: z.number().nonnegative().nullable(),
});

function grouped(rows: Attempt[], reviews: Review[], key: (row: Attempt) => string[]) {
  const names = [...new Set(rows.flatMap(key))];
  return Object.fromEntries(names.map(name => {
    const subset = rows.filter(row => key(row).includes(name));
    const ids = new Set(subset.map(r => r.id));
    return [name, summarize(subset, reviews.filter(r => ids.has(r.attemptId)))];
  }));
}
function usageSummary(rows: Attempt[]) {
  return Object.fromEntries(['input', 'output', 'cacheRead', 'cacheWrite', 'reasoning'].map(key => {
    const values = rows.map(r => r.response.usage[key as keyof Attempt['response']['usage']]).filter((v): v is number => v !== null);
    return [key, { knownAttempts: values.length, knownSubtotal: values.reduce((sum, n) => sum + n, 0), total: values.length === rows.length && rows.length ? values.reduce((sum, n) => sum + n, 0) : null }];
  }));
}
function makeSummary(manifest: Manifest, rows: Attempt[], reviews: Review[]) {
  const total = summarize(rows, reviews);
  const complete = manifest.status === 'completed' && rows.length === manifest.plannedAttempts;
  if (!complete) total.consistentCases = null;
  const criticalByType: Record<string, number> = {};
  for (const review of reviews) {
    if (!review.reviewer.trim() || Object.values(review.scores).some(v => v === null) || review.criticalErrors === null) continue;
    for (const type of new Set(review.criticalErrors)) criticalByType[type] = (criticalByType[type] ?? 0) + 1;
  }
  return { runId: manifest.runId, status: manifest.status, complete, plannedAttempts: manifest.plannedAttempts,
    unexecutedAttempts: manifest.plannedAttempts - rows.length, total, criticalByType, usage: usageSummary(rows),
    costPerSuccessfulCardUsd: complete && total.reviewed === rows.length && total.success && total.costUsd !== null ? total.costUsd / total.success : null,
    bySplit: grouped(rows, reviews, r => [r.split]), byCurriculum: grouped(rows, reviews, r => [r.curriculum]),
    byTag: grouped(rows, reviews, r => r.tags), byContext: grouped(rows, reviews, r => [r.missingContext ? 'missing' : 'present']) };
}
function reportMarkdown(manifest: Manifest, summary: ReturnType<typeof makeSummary>) {
  const s = summary.total;
  const metric = (n: number | null) => n === null ? 'offen / unbekannt' : String(Math.round(n * 100) / 100);
  const lines = [ '# Kompetenzkarten-Evaluation', '',
    `Run: ${manifest.runId} · Modell: ${manifest.configuration.model} · Provider: ${manifest.configuration.provider}`, '',
    `Status: ${manifest.status}; ${s.attempts}/${manifest.plannedAttempts} Aufrufe gespeichert.`, '',
    '**Automatische Prüfung ist kein Nachweis von Faktentreue oder sprachlicher Qualität.** Labels stammen aus dem synthetischen Entwurf.', '',
    '| Messwert | Ergebnis |', '|---|---|',
    `| Schema gültig | ${s.schemaValid}/${s.attempts} |`,
    `| Alle automatischen Kriterien erfüllt | ${s.automaticPass}/${s.attempts} |`,
    `| quality korrekt | ${s.qualityMatches}/${s.attempts} |`,
    `| overlap korrekt (fehlender Kontext separat in summary.json) | ${s.overlapMatches}/${s.attempts} |`,
    `| Aufruffehler / nicht regulär beendet | ${s.transportErrors} / ${s.incomplete} |`,
    `| Fachlich vollständig bewertet | ${s.reviewed}/${s.attempts} |`,
    `| Fachlich und automatisch erfolgreich (unter den bewerteten Versuchen) | ${metric(s.success)} |`,
    `| Bewertete Versuche mit kritischen Fehlern | ${metric(s.criticalErrors)} |`,
    `| Semantikmittelwert (nur bewertete Versuche, max. 10) | ${metric(s.meanSemanticScore)} |`,
    `| Fälle mit allen Wiederholungen erfolgreich | ${metric(s.consistentCases)} |`,
    `| End-to-End p50 / p95 (ms, inkl. Fehler) | ${metric(s.p50Ms)} / ${metric(s.p95Ms)} |`,
    `| Gesamtkosten USD (${s.costKnownAttempts}/${s.attempts} Versuche mit bekannter Schätzung) | ${metric(s.costUsd)} |`,
    `| Kosten pro fachlich erfolgreicher Ausgabe USD | ${metric(summary.costPerSuccessfulCardUsd)} |`, '',
    '## Nach Split', '', '| Split | Versuche | Automatisch bestanden | Bewertet | Erfolgreich |', '|---|---:|---:|---:|---:|' ];
  for (const [name, group] of Object.entries(summary.bySplit)) lines.push(`| ${name} | ${group.attempts} | ${group.automaticPass} | ${group.reviewed} | ${metric(group.success)} |`);
  lines.push('', 'Weitere Aufschlüsselungen nach Lehrgang, Falltyp und Kontext sowie Tokenwerte: summary.json.', '',
    'Fachliche Bewertung: review-packet.json lesen, reviews.json ausfüllen und `bun run eval --report <Laufverzeichnis>` ausführen.',
    'null bedeutet unbewertet/unbekannt. Leere criticalErrors-Liste bedeutet ausdrücklich geprüft und keine kritischen Fehler gefunden.',
    'Keine automatische Reparatur, kein Retry, Parallelität 1; kein separater Warm-up. Erste Anfrage und Cache-Effekte sind in den Zeiten enthalten.', '');
  return lines.join('\n');
}

export async function writeReport(directory: string): Promise<number> {
  const manifest = manifestSchema.parse(JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')));
  if (manifest.status === 'dry-run') throw new Error('Dry-run enthält keine Modellergebnisse');
  const datasetRaw = await readFile(join(directory, 'dataset.json'), 'utf8');
  const prompt = await readFile(join(directory, 'system-prompt.txt'), 'utf8');
  const rubric = await readFile(join(directory, 'rubric.md'), 'utf8');
  if (hash(datasetRaw) !== manifest.hashes.dataset || hash(prompt) !== manifest.hashes.prompt || hash(rubric) !== manifest.hashes.rubric) throw new Error('Laufsnapshot wurde verändert');
  const dataset = parseDataset(JSON.parse(datasetRaw));
  const data = (await readFile(join(directory, 'results.jsonl'), 'utf8')).split('\n').filter(line => line.trim());
  const rows: Attempt[] = data.map(line => {
    const row = storedAttemptSchema.parse(JSON.parse(line));
    const card = dataset.cases.find(c => c.id === row.caseId);
    if (!card || row.id !== `${row.caseId}::${row.repeat}`) throw new Error('Ungültige Fallreferenz im Ergebnis');
    return { ...row, grade: evaluateOutput(row.response.text, card, row.response.finishReason) };
  });
  const envelope = z.object({ runId: z.string(), reviews: z.unknown() }).parse(JSON.parse(await readFile(join(directory, 'reviews.json'), 'utf8')));
  if (envelope.runId !== manifest.runId) throw new Error('Review-Run-ID passt nicht zum Lauf');
  const reviews = parseReviews(envelope.reviews);
  const summary = makeSummary(manifest, rows, reviews);
  await writeFile(join(directory, 'summary.json'), json(summary));
  await writeFile(join(directory, 'report.md'), reportMarkdown(manifest, summary));
  return !summary.complete || summary.total.automaticPass !== rows.length || (summary.total.success !== null && summary.total.success !== summary.total.reviewed) ? 2 : 0;
}

export async function main(args: string[], env: NodeJS.ProcessEnv, transport: EvalTransport = fetch, log: (message: string) => void = console.log): Promise<number> {
  const opts = options(args);
  if (opts.help) { log(HELP); return 0; }
  if (opts.mode === 'report') {
    const code = await writeReport(opts.report!);
    log(`Bericht aktualisiert: ${join(opts.report!, 'report.md')}`);
    return code;
  }
  const config = loadEvalConfig(env);
  const datasetRaw = await readFile(opts.dataset ?? join(repoRoot, 'docs/evals/competency-cards.v0.1.json'), 'utf8');
  const dataset: Dataset = parseDataset(JSON.parse(datasetRaw));
  const selected = selectedCases(config, dataset);
  const system = opts.prompt ? await readFile(opts.prompt, 'utf8') : SYSTEM_PROMPT;
  if (!system.trim()) throw new Error('Leerer Systemprompt');
  const rubric = await readFile(join(repoRoot, 'docs/evals/README.md'), 'utf8');
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
  const out = opts.out ?? join(repoRoot, 'eval-results', runId);
  // Exclusive directory creation prevents accidental replacement of earlier runs/reviews.
  await mkdir(dirname(out), { recursive: true });
  await mkdir(out);
  const { apiKey: _apiKey, ...configuration } = config;
  const manifest: Manifest = { runId, createdAt: new Date().toISOString(), status: opts.mode === 'run' ? 'running' : 'dry-run',
    plannedAttempts: selected.length * config.repetitions, completedAttempts: 0, configuration,
    datasetVersion: dataset.version, datasetStatus: dataset.status,
    hashes: { dataset: hash(datasetRaw), prompt: hash(system), rubric: hash(rubric),
      core: hash(await readFile(new URL('./core.ts', import.meta.url), 'utf8')),
      cli: hash(await readFile(new URL('./cli.ts', import.meta.url), 'utf8')) },
    protocol: { parallelism: 1, retries: 0, repairs: 0, warmup: false, streaming: false, thinking: config.provider === 'openai-compatible' ? 'provider-default' : 'disabled' },
  };
  const save = (name: string, value: unknown) => writeFile(join(out, name), redact(json(value), config.apiKey));
  await save('manifest.json', manifest);
  await writeFile(join(out, 'dataset.json'), datasetRaw);
  await writeFile(join(out, 'system-prompt.txt'), system);
  await writeFile(join(out, 'rubric.md'), rubric);
  await save('output-schema.json', outputJsonSchema);
  log(`${opts.mode}: ${selected.length} Fälle × ${config.repetitions} = ${manifest.plannedAttempts} Aufrufe; ${config.provider}/${config.model}`);
  log(`Ausgabe: ${out}`);
  if (opts.mode === 'dry-run') {
    await save('plan.json', selected.map(c => ({ caseId: c.id, request: buildEvalRequest(config, c.input, system) })));
    log('Keine API-Aufrufe ausgeführt. Für den Modelllauf --run verwenden.');
    return 0;
  }
  const rows: Attempt[] = [];
  const reviews: Review[] = [];
  await writeFile(join(out, 'results.jsonl'), '');
  const packet: unknown[] = [];
  await save('reviews.json', { runId, reviews });
  try {
    for await (const row of runEvaluation(config, dataset, system, transport)) {
      await appendFile(join(out, 'results.jsonl'), redact(`${JSON.stringify(row)}\n`, config.apiKey));
      rows.push(row); reviews.push(emptyReview(row));
      const card = selected.find(c => c.id === row.caseId)!;
      packet.push({ attemptId: row.id, input: card.input, expected: card.expected, output: row.grade.output ?? row.response.text, automatic: row.grade });
      manifest.completedAttempts = rows.length;
      await save('reviews.json', { runId, reviews });
      await save('review-packet.json', packet);
      await save('manifest.json', manifest);
      log(`[${rows.length}/${manifest.plannedAttempts}] ${row.id}: ${row.response.error ?? (row.grade.automaticPass ? 'automatisch OK; Review offen' : 'automatische Kriterien verletzt')}`);
    }
    manifest.status = 'completed';
  } catch (error) {
    manifest.status = 'interrupted';
    throw error;
  } finally {
    await save('manifest.json', manifest);
  }
  const code = await writeReport(out);
  log(`Bericht: ${join(out, 'report.md')} · Fachliche Bewertung: reviews.json`);
  return code;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2), process.env).then(code => { process.exitCode = code; }).catch(error => {
    console.error(redact(error instanceof Error ? error.message : String(error), process.env.LLM_API_KEY ?? ''));
    process.exitCode = 1;
  });
}
