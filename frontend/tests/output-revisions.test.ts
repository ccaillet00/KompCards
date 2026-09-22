import { describe, expect, it } from 'vitest'
import { orderOutputRevisions } from '../utils/outputRevisions'
import type { CompetencyOutput } from '../types/proof'

function output(
  id: number,
  predecessor: number | null,
  createdAt = `2026-09-${String(id).padStart(2, '0')}T08:00:00.000Z`,
): CompetencyOutput {
  return {
    id,
    predecessor,
    competencyInputId: 4,
    workResult: `Auswertung ${id}`,
    quality: 3,
    qualityStatement: `Begründung ${id}`,
    llmModel: 'test-model',
    createdAt,
    overlapCurriculum: true,
    noteImprovment: null,
    isSaved: false,
    userFeedback: null,
  }
}

describe('orderOutputRevisions', () => {
  it('ordnet eine Revisionskette vom ältesten zum neuesten Output', () => {
    expect(orderOutputRevisions([
      output(3, 2),
      output(1, null),
      output(2, 1),
    ]).map(item => item.id)).toEqual([1, 2, 3])
  })

  it('behält Outputs mit fehlendem Vorgänger stabil und vollständig bei', () => {
    expect(orderOutputRevisions([
      output(4, 99, '2026-09-04T08:00:00.000Z'),
      output(2, null, '2026-09-02T08:00:00.000Z'),
      output(3, 2, '2026-09-03T08:00:00.000Z'),
    ]).map(item => item.id)).toEqual([2, 3, 4])
  })

  it('stürzt bei einem Zyklus nicht ab und zeigt jeden Output genau einmal', () => {
    expect(orderOutputRevisions([output(2, 3), output(3, 2)]).map(item => item.id))
      .toEqual([2, 3])
  })
})
