export type ProofStatus = 1 | 2 | 3 | 4 | 5 | 6

export interface CompetencyProof {
  id: number
  userId: string
  competencyId: number
  copiedFromProofId: number | null
  status: ProofStatus
  createdAt: string
  updatedAt: string
}

export interface CompetencyTree {
  id: number
  code: string
  description: string
}

export interface AreaTree {
  id: number
  code: string
  titel: string
  competencies: CompetencyTree[]
}

export interface CurriculumTree {
  id: number
  code: string
  titel: string
  areas: AreaTree[]
}

export interface ProofCard extends CompetencyProof {
  competencyCode: string
  competencyDescription: string
  areaCode: string
  areaTitle: string
  curriculumTitle: string
}

export interface ProofsResponse {
  proofs: CompetencyProof[]
}
