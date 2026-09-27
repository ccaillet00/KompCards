import { afterEach, describe, expect, it, vi } from 'vitest';

import { OpenAiCompatibleLlmClient } from '../src/llm/client.js';

const output = {
  work_result: 'Ich habe ein System entwickelt.',
  quality: 3,
  quality_statement: 'Ein überprüfbares Ergebnis ist aus den Angaben nicht hervorgegangen.',
  overlap_curriculum: true,
  note_improvment: null,
};

async function generate(note: unknown, overrides: Record<string, unknown> = {}) {
  // Real SDK parsing and validation, but no network or actual model call.
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    id: 'test-completion',
    created: 0,
    model: 'test-model',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: JSON.stringify({ ...output, note_improvment: note, ...overrides }) },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  }), { headers: { 'Content-Type': 'application/json' } })));

  return new OpenAiCompatibleLlmClient({
    llmBaseUrl: 'https://llm.invalid/v1',
    llmApiKey: 'test-key',
    llmModel: 'test-model',
  }).generateCompetencyOutput({
    userRole: 'Student', what: 'System entwickelt', how: '4Phase-Modell',
    why: 'Kompetenzkarten vereinfachen', environment: 'Schulprojekt', subject: null,
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('OpenAiCompatibleLlmClient', () => {
  it('normalisiert Hinweise als String-Liste vor der SDK-Validierung', async () => {
    const notes = [
      'Es fehlt eine konkrete Beschreibung der Systemspezifikation oder des technischen Entwurfs.',
      'Ein überprüfbares Ergebnis (z.B. Abnahme oder Funktionsbericht) wurde nicht angegeben.',
    ];
    expect(await generate(notes)).toEqual({
      workResult: output.work_result,
      quality: 3,
      qualityStatement: output.quality_statement,
      overlapCurriculum: true,
      noteImprovment: notes.join('\n'),
    });
  });

  it.each(['Mehr Details.', null])('erhält gültige Hinweise unverändert: %s', async (note) => {
    expect((await generate(note)).noteImprovment).toBe(note);
  });

  it('normalisiert eine leere Hinweis-Liste zu null', async () => {
    expect((await generate([])).noteImprovment).toBeNull();
  });

  it.each([[['Hinweis', 42]], [[{ text: 'Hinweis' }]], [42], [{}]])(
    'lehnt ungültige Hinweis-Typen weiterhin ab: %j', async (note) => {
      await expect(generate(note)).rejects.toThrow();
    },
  );

  it('lehnt trotz gültiger Hinweis-Liste eine ungültige Bewertung ab', async () => {
    await expect(generate(['Hinweis'], { quality: 5 })).rejects.toThrow();
  });
});
