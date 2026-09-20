import { describe, expect, it } from 'vitest';

import { llmOutputSchema } from '../src/llm/schema.js';

describe('llmOutputSchema', () => {
  it('akzeptiert ein gültiges strukturiertes Ergebnis', () => {
    const result = llmOutputSchema.parse({
      work_result: 'Klare Ausformulierung',
      quality: 3,
      quality_statement: 'Solide Umsetzung mit klarem Bezug zur Kompetenz.',
      overlap_curriculum: true,
      note_improvment: 'Mehr Details',
    });
    expect(result.quality).toBe(3);
    expect(result.quality_statement).toBe('Solide Umsetzung mit klarem Bezug zur Kompetenz.');
    expect(result.overlap_curriculum).toBe(true);
  });

  it('erlaubt null für note_improvment', () => {
    const result = llmOutputSchema.parse({
      work_result: 'x',
      quality: 4,
      quality_statement: 'Sehr gute Qualität.',
      overlap_curriculum: false,
      note_improvment: null,
    });
    expect(result.note_improvment).toBeNull();
  });

  it('verwirft quality außerhalb von 1–4', () => {
    expect(() =>
      llmOutputSchema.parse({
        work_result: 'x',
        quality: 5,
        quality_statement: 'Test',
        overlap_curriculum: false,
        note_improvment: null,
      }),
    ).toThrow();
    expect(() =>
      llmOutputSchema.parse({
        work_result: 'x',
        quality: 0,
        quality_statement: 'Test',
        overlap_curriculum: false,
        note_improvment: null,
      }),
    ).toThrow();
  });

  it('verwirft ein leeres work_result', () => {
    expect(() =>
      llmOutputSchema.parse({
        work_result: '',
        quality: 1,
        quality_statement: 'Test',
        overlap_curriculum: false,
        note_improvment: null,
      }),
    ).toThrow();
  });

  it('verwirft ein leeres quality_statement', () => {
    expect(() =>
      llmOutputSchema.parse({
        work_result: 'x',
        quality: 3,
        quality_statement: '',
        overlap_curriculum: false,
        note_improvment: null,
      }),
    ).toThrow();
  });

  it('verwirft fehlendes quality_statement', () => {
    expect(() =>
      llmOutputSchema.parse({
        work_result: 'x',
        quality: 3,
        overlap_curriculum: false,
        note_improvment: null,
      }),
    ).toThrow();
  });
});
