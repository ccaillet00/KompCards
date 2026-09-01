import { describe, expect, it } from 'vitest';

import { buildPrompt } from '../src/llm/prompt.js';
import type { LlmRequest } from '../src/llm/types.js';

const base: LlmRequest = {
  userRole: 'Praktikant',
  what: 'API entwickelt',
  how: 'mit Express',
  why: 'um Daten bereitzustellen',
  environment: 'Firmen-Praktikum',
  subject: null,
};

describe('buildPrompt', () => {
  it('enthält alle Felder der strukturierten Eingabe', () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain('Praktikant');
    expect(prompt).toContain('API entwickelt');
    expect(prompt).toContain('mit Express');
    expect(prompt).toContain('um Daten bereitzustellen');
    expect(prompt).toContain('Firmen-Praktikum');
  });

  it('lässt leeres subject weg', () => {
    expect(buildPrompt(base)).not.toContain('Vorgaben der Dozentin');
  });

  it('nimmt subject auf, wenn vorhanden', () => {
    const prompt = buildPrompt({ ...base, subject: 'REST-Endpunkte' });
    expect(prompt).toContain('REST-Endpunkte');
  });

  it('berücksichtigt Feedback bei einem Retry', () => {
    const prompt = buildPrompt({ ...base, userFeedback: 'Bitte kürzer' });
    expect(prompt).toContain('Bitte kürzer');
  });
});
