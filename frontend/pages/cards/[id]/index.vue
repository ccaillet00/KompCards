<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { definePageMeta, useRoute, useRouter, useSeoMeta } from '#imports'
import ProofStatusBadge from '../../../components/proof/ProofStatusBadge.vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import CompetencySummary from '../../../components/workflow/CompetencySummary.vue'
import DocumentationField from '../../../components/workflow/DocumentationField.vue'
import WorkflowSteps from '../../../components/workflow/WorkflowSteps.vue'
import { useCompetencyWorkflow } from '../../../composables/useCompetencyWorkflow'
import type { CompetencyInputPayload } from '../../../types/proof'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Arbeit dokumentieren – KompCards' })

const route = useRoute()
const router = useRouter()
const proofId = Number(route.params.id)
const {
  proof,
  competencyContext,
  isLoading,
  isSaving,
  isChecking,
  error,
  loadProof,
  saveInput,
  triggerLlmCheck,
} = useCompetencyWorkflow()
const form = reactive<CompetencyInputPayload>({
  userRole: '',
  what: '',
  how: '',
  why: '',
  environment: '',
})
const errors = reactive<Partial<Record<keyof CompetencyInputPayload, string>>>({})
const savedMessage = ref<string | null>(null)
const lastSavedSnapshot = ref<string | null>(null)
const hydrated = ref(false)
const editable = computed(() => proof.value ? [1, 3, 4].includes(proof.value.status) : false)

function snapshot(): string {
  return JSON.stringify(form)
}

function validateForCheck(): boolean {
  const messages: Record<keyof CompetencyInputPayload, string> = {
    userRole: 'Bitte beschreibe deine Rolle.',
    what: 'Bitte beschreibe, was du gemacht hast.',
    how: 'Bitte beschreibe dein Vorgehen.',
    why: 'Bitte begründe dein Vorgehen.',
    environment: 'Bitte beschreibe das Umfeld.',
  }
  let valid = true
  for (const key of Object.keys(messages) as Array<keyof CompetencyInputPayload>) {
    errors[key] = form[key].trim() ? undefined : messages[key]
    if (errors[key]) valid = false
  }
  return valid
}

async function saveDraft(): Promise<boolean> {
  if (!editable.value || isSaving.value || isChecking.value) return false
  savedMessage.value = null
  try {
    await saveInput(proofId, { ...form })
    lastSavedSnapshot.value = snapshot()
    savedMessage.value = 'Dein Entwurf wurde gespeichert.'
    return true
  } catch {
    return false
  }
}

async function checkWithLlm(): Promise<void> {
  if (isSaving.value || isChecking.value) return
  savedMessage.value = null
  if (!validateForCheck() || !editable.value) return

  const mustSave = snapshot() !== lastSavedSnapshot.value || proof.value?.status === 4
  if (mustSave && !(await saveDraft())) return

  try {
    const output = await triggerLlmCheck(proofId)
    if (output) await router.push(`/cards/${proofId}/result`)
  } catch {
    // Der Workflow-Service stellt die API-Fehlermeldung bereit.
  }
}

watch(form, () => {
  if (!hydrated.value) return
  savedMessage.value = null
}, { deep: true })

onMounted(async () => {
  if (!Number.isSafeInteger(proofId) || proofId < 1) {
    error.value = 'Ungültige Kompetenzkarte.'
    return
  }
  await loadProof(proofId)
  const latestInput = proof.value?.inputs.reduce((latest, input) => input.id > latest.id ? input : latest, proof.value.inputs[0])
  if (latestInput) {
    form.userRole = latestInput.userRole
    form.what = latestInput.what
    form.how = latestInput.how
    form.why = latestInput.why
    form.environment = latestInput.environment
    lastSavedSnapshot.value = snapshot()
  }
  hydrated.value = true
})
</script>

<template>
  <div class="relative isolate min-h-[calc(100vh-5rem)] overflow-hidden">
    <img
      src="/images/fox-world/work-documentation.webp"
      alt="Fuchs dokumentiert seine Arbeit mit Blick auf die Bergwelt"
      class="absolute inset-y-0 right-0 -z-20 hidden h-full w-[54%] object-cover object-center lg:block"
    >
    <div class="absolute inset-0 -z-10 bg-gradient-to-r from-base-100 via-base-100/95 to-base-100/10" />

    <div class="page-shell py-8 xl:py-10">
      <NuxtLink
        to="/cards"
        class="inline-flex items-center gap-2 text-sm text-base-content/60 hover:text-primary"
      >
        <UiIcon
          name="arrow-left"
          :size="17"
        />
        Zurück zu meinen Karten
      </NuxtLink>

      <div class="mt-5 grid max-w-6xl gap-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)] lg:items-start">
        <main>
          <p class="text-sm text-base-content/55">
            Kompetenzkarte erstellen&nbsp; › &nbsp;Eingabe
          </p>
          <h1 class="mt-3 font-display text-5xl font-bold leading-tight text-primary">
            Arbeit dokumentieren
          </h1>
          <p class="mt-2 max-w-3xl text-lg leading-7 text-base-content/65">
            Beschreibe deine Arbeit möglichst konkret und nachvollziehbar. Je detaillierter deine Angaben, desto besser kann dich die KI unterstützen.
          </p>

          <WorkflowSteps
            :current="2"
            class="mt-7"
          />

          <div
            v-if="error"
            role="alert"
            class="alert alert-error mt-7"
          >
            {{ error }}
          </div>
          <div
            v-if="savedMessage"
            role="status"
            class="alert mt-7 border border-success/20 bg-success/10 text-success"
          >
            <UiIcon
              name="circle-check"
              :size="20"
            /> {{ savedMessage }}
          </div>
          <div
            v-if="isLoading"
            class="mt-8 space-y-5"
            aria-label="Dokumentation wird geladen"
          >
            <div
              v-for="item in 5"
              :key="item"
              class="skeleton h-24 bg-base-300/60"
            />
          </div>
          <form
            v-else-if="proof"
            class="mt-9 space-y-6"
            @submit.prevent="checkWithLlm"
          >
            <DocumentationField
              id="user-role"
              v-model="form.userRole"
              label="Rolle"
              hint="Welche Rolle hattest du in der Arbeit?"
              placeholder="z. B. Entwickler, Projektleiter, Teil eines Teams …"
              :error="errors.userRole"
              :disabled="!editable || isSaving || isChecking"
            />
            <DocumentationField
              id="what"
              v-model="form.what"
              label="Was hast du gemacht?"
              hint="Beschreibe kurz und konkret, was du gemacht hast."
              placeholder="z. B. Datenmodell für eine Anwendung entworfen …"
              :error="errors.what"
              :disabled="!editable || isSaving || isChecking"
            />
            <DocumentationField
              id="how"
              v-model="form.how"
              label="Wie bist du vorgegangen?"
              hint="Beschreibe, wie du die Arbeit umgesetzt hast."
              placeholder="z. B. Anforderungen analysiert, Modelle skizziert …"
              :error="errors.how"
              :disabled="!editable || isSaving || isChecking"
            />
            <DocumentationField
              id="why"
              v-model="form.why"
              label="Warum hast du so gehandelt?"
              hint="Erkläre, warum du diesen Weg gewählt hast."
              placeholder="z. B. um eine skalierbare Lösung zu erreichen …"
              :error="errors.why"
              :disabled="!editable || isSaving || isChecking"
            />
            <DocumentationField
              id="environment"
              v-model="form.environment"
              label="Umfeld"
              hint="In welchem Umfeld fand die Arbeit statt?"
              placeholder="z. B. Schulprojekt, Praktikum, Berufsalltag …"
              :error="errors.environment"
              :disabled="!editable || isSaving || isChecking"
            />

            <div class="flex flex-wrap items-center justify-between gap-4 border-t border-primary/10 pt-6">
              <p class="flex items-center gap-2 text-sm text-base-content/55">
                <UiIcon
                  name="circle-check"
                  :size="18"
                  class="text-primary"
                />
                Entwürfe können auch unvollständig gespeichert werden.
              </p>
              <div class="flex gap-3">
                <UiButton
                  type="button"
                  variant="secondary"
                  data-test="save-draft"
                  :disabled="!editable || isSaving || isChecking"
                  @click="saveDraft"
                >
                  <UiIcon
                    name="file-text"
                    :size="19"
                  />
                  {{ isSaving ? 'Wird gespeichert …' : 'Entwurf speichern' }}
                </UiButton>
                <UiButton
                  type="submit"
                  :disabled="!editable || isSaving || isChecking"
                >
                  <span
                    v-if="isChecking"
                    class="loading loading-spinner loading-sm"
                  />
                  {{ isChecking ? 'LLM prüft …' : 'Mit LLM prüfen' }}
                  <UiIcon
                    v-if="!isChecking"
                    name="arrow-right"
                    :size="19"
                  />
                </UiButton>
              </div>
            </div>
          </form>
        </main>

        <aside
          v-if="competencyContext"
          class="lg:sticky lg:top-28"
        >
          <CompetencySummary
            :code="competencyContext.competency.code"
            :description="competencyContext.competency.description"
            :area="`${competencyContext.area.code} – ${competencyContext.area.titel}`"
          >
            <ProofStatusBadge
              v-if="proof"
              :status="proof.status"
              class="mt-3"
            />
          </CompetencySummary>
        </aside>
      </div>
    </div>
  </div>
</template>
