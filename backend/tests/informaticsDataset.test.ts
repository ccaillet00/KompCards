import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parseDataset } from '../src/eval/core.js';

const load = async () => ({
  dataset: parseDataset(JSON.parse(await readFile('../docs/evals/informatics-cards.v1.0.json', 'utf8'))),
  catalog: JSON.parse(await readFile('../docs/evals/informatics-catalog.v1.0.json', 'utf8')) as {
    sources: Array<{ file: string; sha256: string }>;
    curricula: Array<{ id: string; code: string; titel: string }>;
    areas: Array<{ id: string; curriculum_id: string; code: string; titel: string }>;
    competencies: Array<{ id: string; area_id: string; code: string; description: string }>;
  },
});

describe('Informatik-Eval mit CSV-Kompetenzkontext', () => {
  it('validiert alle 40 Fälle im bestehenden Runnerformat und kennzeichnet Erwartungen als ungeprüft', async () => {
    const { dataset } = await load();
    expect(dataset.version).toBe('informatics-1.0.0-draft');
    expect(dataset.status).toBe('synthetic_inputs_unreviewed_labels');
    expect(dataset.cases).toHaveLength(40);
    expect(dataset.cases.filter(c => c.split === 'development')).toHaveLength(30);
    expect(dataset.cases.filter(c => c.split === 'holdout')).toHaveLength(10);
  });

  it('erhält die CSV-Texte und ihre Lehrgang-/Bereichsbeziehungen für jeden Kontext exakt', async () => {
    const { dataset, catalog } = await load();
    expect(catalog.curricula).toHaveLength(1);
    expect(catalog.areas).toHaveLength(15);
    expect(catalog.competencies).toHaveLength(91);
    expect(catalog.sources).toHaveLength(3);
    for (const source of catalog.sources) expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);
    for (const card of dataset.cases) {
      if (!card.input.context) {
        expect(card.tags).toContain('missing_context');
        continue;
      }
      const context = card.input.context;
      const competency = catalog.competencies.find(c => c.code === context.competency.code);
      expect(competency).toBeDefined();
      const area = catalog.areas.find(a => a.id === competency?.area_id);
      const curriculum = catalog.curricula.find(c => c.id === area?.curriculum_id);
      expect(context.competency).toEqual({ code: competency?.code, description: competency?.description });
      expect(context.area).toEqual({ code: area?.code, titel: area?.titel });
      expect(context.curriculum).toEqual({ code: curriculum?.code, titel: curriculum?.titel });
    }
  });

  it('deckt alle 15 Bereiche ab und trennt verwandte Kompetenzfälle zwischen Entwicklung und Holdout', async () => {
    const { dataset, catalog } = await load();
    const codes = (split: 'development' | 'holdout') => new Set(dataset.cases
      .filter(c => c.split === split).map(c => c.input.context?.competency.code).filter(Boolean));
    const development = codes('development');
    expect([...codes('holdout')].filter(code => development.has(code))).toEqual([]);
    const areas = new Set(dataset.cases.filter(c => c.split === 'development').map(c => c.input.context?.area.code));
    expect(catalog.areas.every(area => areas.has(area.code))).toBe(true);
  });

  it('enthält Grenzfälle und passende Erwartungen für Nachweis, Bewertung und Rückfragen', async () => {
    const { dataset } = await load();
    const tags = new Set(dataset.cases.flatMap(c => c.tags));
    for (const tag of ['negative_outcome', 'qualitative_evidence', 'missing_outcome', 'vague_method',
      'contradiction', 'no_overlap', 'missing_context', 'instruction_in_data', 'unsupported_feedback_claim',
      'method_justification_only', 'team_role', 'typos']) expect(tags.has(tag)).toBe(true);
    for (const card of dataset.cases) {
      expect(card.expected.must_preserve).toContain(card.input.userRole);
      expect(card.expected.quality_statement_semantics).not.toContain('Ein überprüfbares Ergebnis ist aus den Angaben nicht hervorgegangen.');
      if (!card.expected.result_evidence) expect(card.expected.note_improvment_required).toBe(true);
      if (card.tags.includes('negative_outcome') || card.tags.includes('no_overlap')) {
        expect(card.expected.quality).toBe(4);
        expect(card.expected.result_evidence).toBeTruthy();
      }
      if (card.tags.includes('contradiction') || card.tags.includes('missing_action')) expect(card.expected.quality).toBe(1);
      if (card.tags.includes('no_overlap') || card.tags.includes('missing_context')) expect(card.expected.overlap_curriculum).toBe(false);
    }
  });
});
