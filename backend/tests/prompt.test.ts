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

  it('rendert den Kontext-Block oben, wenn context vorhanden ist', () => {
    const prompt = buildPrompt({
      ...base,
      context: {
        competency: { code: 'A1.1', description: 'Grundlagen der Informatik' },
        area: { code: 'A1', titel: 'Grundlagen' },
        curriculum: { code: 'RLP_INF', titel: 'Informatik' },
      },
    });
    expect(prompt).toContain('Kontext:');
    expect(prompt).toContain('RLP_INF (Informatik)');
    expect(prompt).toContain('A1 (Grundlagen)');
    expect(prompt).toContain('A1.1 (Grundlagen der Informatik)');
  });

  it('Kontext-Block steht vor der strukturierten Eingabe', () => {
    const prompt = buildPrompt({
      ...base,
      context: {
        competency: { code: 'A1.1', description: 'Grundlagen' },
        area: { code: 'A1', titel: 'Grundlagen' },
        curriculum: { code: 'RLP_INF', titel: 'Informatik' },
      },
    });
    const contextIdx = prompt.indexOf('Kontext:');
    const inputIdx = prompt.indexOf('Strukturierte Eingabe');
    expect(contextIdx).toBeLessThan(inputIdx);
  });

  it('enthält keinen Kontext-Block ohne context', () => {
    const prompt = buildPrompt(base);
    expect(prompt).not.toContain('- Lehrgang:');
    expect(prompt).not.toContain('- Kompetenz:');
  });
});
