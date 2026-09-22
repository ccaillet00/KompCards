import type { CompetencyOutput } from '../types/proof'

function compareStable(left: CompetencyOutput, right: CompetencyOutput): number {
  const byDate = Date.parse(left.createdAt) - Date.parse(right.createdAt)
  if (Number.isFinite(byDate) && byDate !== 0) return byDate
  return left.id - right.id
}

/**
 * Ordnet Outputs vom Ursprung zu den Revisionen. Beschädigte oder zyklische
 * predecessor-Verweise werden über Erstellzeit und ID stabil eingeordnet,
 * ohne einen verfügbaren Output auszublenden.
 */
export function orderOutputRevisions(outputs: CompetencyOutput[]): CompetencyOutput[] {
  const stable = [...outputs].sort(compareStable)
  const byId = new Map(stable.map(output => [output.id, output]))
  const children = new Map<number, CompetencyOutput[]>()
  const roots: CompetencyOutput[] = []

  for (const output of stable) {
    if (output.predecessor === null
      || output.predecessor === output.id
      || !byId.has(output.predecessor)) {
      roots.push(output)
      continue
    }
    const siblings = children.get(output.predecessor) ?? []
    siblings.push(output)
    children.set(output.predecessor, siblings)
  }

  const ordered: CompetencyOutput[] = []
  const visited = new Set<number>()
  const visit = (output: CompetencyOutput) => {
    if (visited.has(output.id)) return
    visited.add(output.id)
    ordered.push(output)
    for (const child of (children.get(output.id) ?? []).sort(compareStable)) visit(child)
  }

  for (const root of roots) visit(root)
  for (const output of stable) visit(output)
  return ordered
}
