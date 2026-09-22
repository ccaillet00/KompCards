import { ref } from 'vue'
import { useRuntimeConfig } from '#imports'
import { $fetch } from 'ofetch'
import type {
  CurriculumTree,
  ProofCard,
  ProofsResponse,
} from '../types/proof'
import { useAuth } from './useAuth'

function requestErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const message = (data as { error?: unknown }).error
      if (typeof message === 'string') return message
    }
  }
  return 'Die Kompetenzkarten konnten nicht geladen werden. Bitte versuche es erneut.'
}

function mergeProofsWithCurriculum(response: ProofsResponse, curricula: CurriculumTree[]): ProofCard[] {
  const competencyDetails = new Map<number, Omit<ProofCard,
    'id' | 'userId' | 'competencyId' | 'copiedFromProofId' | 'status' | 'createdAt' | 'updatedAt'>>()

  for (const curriculum of curricula) {
    for (const area of curriculum.areas) {
      for (const competency of area.competencies) {
        competencyDetails.set(competency.id, {
          competencyCode: competency.code,
          competencyDescription: competency.description,
          areaCode: area.code,
          areaTitle: area.titel,
          curriculumTitle: curriculum.titel,
        })
      }
    }
  }

  return response.proofs
    .map((proof) => ({
      ...proof,
      ...(competencyDetails.get(proof.competencyId) ?? {
        competencyCode: `#${proof.competencyId}`,
        competencyDescription: 'Kompetenzdetails nicht verfügbar',
        areaCode: '',
        areaTitle: 'Bereich nicht verfügbar',
        curriculumTitle: '',
      }),
    }))
    .sort((a, b) => {
      const dateDifference = Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
      return Number.isNaN(dateDifference) || dateDifference === 0 ? b.id - a.id : dateDifference
    })
}

export function useProofs() {
  const config = useRuntimeConfig()
  const auth = useAuth()
  const cards = ref<ProofCard[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    if (!auth.token.value) {
      error.value = 'Deine Sitzung ist nicht mehr gültig. Bitte melde dich erneut an.'
      return
    }

    isLoading.value = true
    error.value = null
    const options = { headers: { Authorization: `Bearer ${auth.token.value}` } }
    try {
      const [proofsResponse, curriculumResponse] = await Promise.all([
        $fetch<ProofsResponse>(`${config.public.apiBase}/competency/proofs`, options),
        $fetch<CurriculumTree[]>(`${config.public.apiBase}/curriculum`, options),
      ])
      cards.value = mergeProofsWithCurriculum(proofsResponse, curriculumResponse)
    } catch (requestError) {
      error.value = requestErrorMessage(requestError)
    } finally {
      isLoading.value = false
    }
  }

  return { cards, isLoading, error, load }
}
