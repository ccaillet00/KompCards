import { computed, ref } from 'vue'
import { useRuntimeConfig } from '#imports'
import { $fetch } from 'ofetch'
import type {
  CompetencyContext,
  CompetencyInput,
  CompetencyInputPayload,
  CompetencyOutput,
  CompetencyProof,
  CurriculumTree,
  ProofDetail,
} from '../types/proof'
import { useAuth } from './useAuth'

function apiErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const message = (data as { error?: unknown }).error
      if (typeof message === 'string') return message
    }
  }
  return 'Die Anfrage konnte nicht abgeschlossen werden. Bitte versuche es erneut.'
}

export function useCompetencyWorkflow() {
  const config = useRuntimeConfig()
  const auth = useAuth()
  const curricula = ref<CurriculumTree[]>([])
  const proof = ref<ProofDetail | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const isChecking = ref(false)
  const error = ref<string | null>(null)

  function handleRequestError(requestError: unknown): void {
    error.value = auth.handleUnauthorized(requestError)
      ? 'Deine Sitzung ist nicht mehr gültig. Bitte melde dich erneut an.'
      : apiErrorMessage(requestError)
  }

  const competencyContext = computed<CompetencyContext | null>(() => {
    if (!proof.value) return null
    for (const curriculum of curricula.value) {
      for (const area of curriculum.areas) {
        const competency = area.competencies.find(item => item.id === proof.value?.competencyId)
        if (competency) return { curriculum, area, competency }
      }
    }
    return null
  })

  const latestOutput = computed<CompetencyOutput | null>(() => {
    const latestInput = proof.value?.inputs.reduce<CompetencyInput | null>(
      (latest, input) => !latest || input.id > latest.id ? input : latest, null,
    )
    const outputs = latestInput?.outputs ?? []
    return outputs.reduce<CompetencyOutput | null>(
      (latest, output) => !latest || output.id > latest.id ? output : latest,
      null,
    )
  })

  function requestOptions() {
    if (!auth.isAuthenticated.value) {
      error.value = 'Deine Sitzung ist nicht mehr gültig. Bitte melde dich erneut an.'
      throw new Error('Missing auth session')
    }
    return { credentials: 'include' as const }
  }

  async function loadCurricula(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      curricula.value = await $fetch<CurriculumTree[]>(
        `${config.public.apiBase}/curriculum`,
        requestOptions(),
      )
    } catch (requestError) {
      if (!error.value) handleRequestError(requestError)
    } finally {
      isLoading.value = false
    }
  }

  async function createProof(competencyId: number): Promise<CompetencyProof> {
    isSaving.value = true
    error.value = null
    try {
      const response = await $fetch<{ proof: CompetencyProof }>(
        `${config.public.apiBase}/competency/proofs`,
        {
          ...requestOptions(),
          method: 'POST',
          body: { competencyId },
        },
      )
      return response.proof
    } catch (requestError) {
      if (!error.value) handleRequestError(requestError)
      throw requestError
    } finally {
      isSaving.value = false
    }
  }

  async function loadProof(proofId: number): Promise<void> {
    isLoading.value = true
    error.value = null
    proof.value = null
    try {
      const options = requestOptions()
      const [proofResponse, curriculumResponse] = await Promise.all([
        $fetch<{ proof: ProofDetail }>(`${config.public.apiBase}/competency/proofs/${proofId}`, options),
        $fetch<CurriculumTree[]>(`${config.public.apiBase}/curriculum`, options),
      ])
      proof.value = proofResponse.proof
      curricula.value = curriculumResponse
    } catch (requestError) {
      if (!error.value) handleRequestError(requestError)
    } finally {
      isLoading.value = false
    }
  }

  async function saveInput(proofId: number, input: CompetencyInputPayload): Promise<CompetencyInput> {
    isSaving.value = true
    error.value = null
    try {
      const response = await $fetch<{ input: CompetencyInput }>(
        `${config.public.apiBase}/competency/proofs/${proofId}/input`,
        {
          ...requestOptions(),
          method: 'POST',
          body: input,
        },
      )
      const savedInput = { ...response.input, outputs: response.input.outputs ?? [] }
      if (proof.value?.id === proofId) {
        proof.value.inputs.push(savedInput)
        if (proof.value.status === 4) proof.value.status = 1
      }
      return savedInput
    } catch (requestError) {
      if (!error.value) handleRequestError(requestError)
      throw requestError
    } finally {
      isSaving.value = false
    }
  }

  async function triggerLlmCheck(proofId: number): Promise<CompetencyOutput | null> {
    isChecking.value = true
    error.value = null
    try {
      const response = await $fetch<{ output: CompetencyOutput | null, failed: boolean }>(
        `${config.public.apiBase}/competency/proofs/${proofId}/llm-check`,
        {
          ...requestOptions(),
          method: 'POST',
        },
      )
      if (response.failed || !response.output) {
        error.value = 'Die LLM-Prüfung ist fehlgeschlagen. Bitte versuche es erneut.'
        return null
      }
      return response.output
    } catch (requestError) {
      if (!error.value) handleRequestError(requestError)
      throw requestError
    } finally {
      isChecking.value = false
    }
  }

  async function retryOutput(outputId: number, userFeedback: string): Promise<CompetencyOutput> {
    isChecking.value = true
    error.value = null
    try {
      const response = await $fetch<{ output: CompetencyOutput }>(
        `${config.public.apiBase}/competency/outputs/${outputId}/retry`,
        {
          ...requestOptions(),
          method: 'POST',
          body: { userFeedback },
        },
      )
      return response.output
    } catch (requestError) {
      if (!error.value) handleRequestError(requestError)
      throw requestError
    } finally {
      isChecking.value = false
    }
  }

  async function acceptOutput(outputId: number): Promise<CompetencyOutput> {
    isSaving.value = true
    error.value = null
    try {
      const response = await $fetch<{ output: CompetencyOutput }>(
        `${config.public.apiBase}/competency/outputs/${outputId}/accept`,
        {
          ...requestOptions(),
          method: 'POST',
        },
      )
      return response.output
    } catch (requestError) {
      if (!error.value) handleRequestError(requestError)
      throw requestError
    } finally {
      isSaving.value = false
    }
  }

  async function discardProof(proofId: number): Promise<CompetencyProof> {
    isSaving.value = true
    error.value = null
    try {
      const response = await $fetch<{ proof: CompetencyProof }>(
        `${config.public.apiBase}/competency/proofs/${proofId}`,
        {
          ...requestOptions(),
          method: 'DELETE',
        },
      )
      return response.proof
    } catch (requestError) {
      if (!error.value) error.value = apiErrorMessage(requestError)
      throw requestError
    } finally {
      isSaving.value = false
    }
  }

  return {
    curricula,
    proof,
    competencyContext,
    latestOutput,
    isLoading,
    isSaving,
    isChecking,
    error,
    loadCurricula,
    createProof,
    loadProof,
    saveInput,
    triggerLlmCheck,
    retryOutput,
    acceptOutput,
    discardProof,
  }
}
