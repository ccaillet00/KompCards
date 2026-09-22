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

export interface CompetencyInputPayload {
  userRole: string
  what: string
  how: string
  why: string
  environment: string
}

export interface CompetencyOutput {
  id: number
  predecessor: number | null
  competencyInputId: number
  workResult: string
  quality: 1 | 2 | 3 | 4
  qualityStatement: string
  llmModel: string
  createdAt: string
  overlapCurriculum: boolean
  noteImprovment: string | null
  isSaved: boolean
  userFeedback: string | null
}

export interface CompetencyInput extends CompetencyInputPayload {
  id: number
  competencyProofId: number
  subject: string | null
  createdAt: string
  outputs: CompetencyOutput[]
}

export interface ProofDetail extends CompetencyProof {
  inputs: CompetencyInput[]
}

export interface CompetencyContext {
  curriculum: CurriculumTree
  area: AreaTree
  competency: CompetencyTree
}
