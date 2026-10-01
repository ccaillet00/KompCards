<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { definePageMeta, useRoute, useRouter, useSeoMeta } from '#imports'
import ProofStatusBadge from '../../../components/proof/ProofStatusBadge.vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import CompetencySummary from '../../../components/workflow/CompetencySummary.vue'
import DocumentationField from '../../../components/workflow/DocumentationField.vue'
import WorkflowSteps from '../../../components/workflow/WorkflowSteps.vue'
import { useCompetencyWorkflow } from '../../../composables/useCompetencyWorkflow'
import { useUnsavedChanges } from '../../../composables/useUnsavedChanges'
import type { CompetencyInput, CompetencyInputPayload } from '../../../types/proof'

definePageMeta({ middleware: ['service-only', 'auth'] })
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

const { dirty, markSaved } = useUnsavedChanges(snapshot, hydrated)
const saveState = computed(() => isSaving.value ? 'Wird gespeichert …' : dirty.value ? 'Ungespeicherte Änderungen' : 'Gespeichert')

function validateForCheck(): boolean {
  const messages: Record<keyof CompetencyInputPayload, string> = {
    userRole: 'Bitte beschreibe deine Rolle.',
    what: 'Bitte beschreibe, was du gemacht hast.',
    how: 'Bitte beschreibe dein Vorgehen.',
    why: 'Bitte beschreibe den Zweck oder angestrebten Nutzen deiner Arbeit.',
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
    markSaved()
    savedMessage.value = 'Dein Entwurf wurde gespeichert.'
    return true
  } catch {
    return false
  }
}

async function checkWithLlm(): Promise<void> {
  if (isSaving.value || isChecking.value) return
  savedMessage.value = null
  if (!editable.value) return
  if (!validateForCheck()) {
    await nextTick()
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return
  }

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
  const latestInput = proof.value?.inputs.reduce<CompetencyInput | null>(
    (latest, input) => !latest || input.id > latest.id ? input : latest,
    null,
  )
  if (latestInput) {
    form.userRole = latestInput.userRole
    form.what = latestInput.what
    form.how = latestInput.how
    form.why = latestInput.why
    form.environment = latestInput.environment
    lastSavedSnapshot.value = snapshot()
  }
  // Empty new forms also have a baseline; only actual edits trigger a warning.
  markSaved()
  hydrated.value = Boolean(proof.value)
})
</script>

<template>
  <div class="relative isolate min-h-[calc(100vh-5rem)] overflow-hidden">
    <figure
      data-test="page-artwork"
      aria-hidden="true"
      class="absolute inset-0 -z-20 overflow-hidden"
    >
      <img
        src="/images/fox-world/work-documentation.webp"
        alt=""
        class="fox-world-page-image absolute inset-y-0 right-0 hidden h-full w-auto max-w-none object-contain object-right lg:block"
      >
    </figure>
    <div class="fox-world-page-blend absolute inset-0 -z-10" />

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
        <div>
          <p class="text-sm text-base-content/55">
            Kompetenzkarte erstellen&nbsp; › &nbsp;Eingabe
          </p>
          <h1 class="mt-3 font-display text-4xl font-bold leading-tight text-primary">
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
            class="mt-7 space-y-5"
            @submit.prevent="checkWithLlm"
          >
            <p class="text-sm text-base-content/75">
              Alle fünf Angaben sind für die KI-Prüfung erforderlich. Entwürfe kannst du unvollständig speichern.
            </p>
            <DocumentationField
              id="user-role"
              v-model="form.userRole"
              label="Rolle"
              compact
              hint="Welche Rolle hattest du in der Arbeit?"
              placeholder="z. B. Entwickler, Projektleiter, Teil eines Teams …"
              :error="errors.userRole"
              :disabled="!editable || isSaving || isChecking"
            />
            <DocumentationField
              id="what"
              v-model="form.what"
              label="Was hast du gemacht?"
              hint="Beschreibe deine Handlung, das erreichte Ergebnis und woran du es überprüft hast."
              placeholder="z. B. Datenmodell entworfen und mit Testdaten geprüft: Alle 12 Prüffälle waren erfolgreich. Noch offene Ergebnisse ausdrücklich benennen …"
              :error="errors.what"
              :disabled="!editable || isSaving || isChecking"
            />
            <DocumentationField
              id="how"
              v-model="form.how"
              label="Wie bist du vorgegangen?"
              hint="Nenne dein Vorgehen, eingesetzte Werkzeuge und deinen eigenen Beitrag."
              placeholder="z. B. Anforderungen analysiert, Modelle skizziert …"
              :error="errors.how"
              :disabled="!editable || isSaving || isChecking"
            />
            <DocumentationField
              id="why"
              v-model="form.why"
              label="Wozu hast du die Arbeit ausgeführt?"
              hint="Beschreibe den Zweck der Arbeit und den angestrebten Nutzen."
              placeholder="z. B. um Daten konsistent zu speichern und doppelte Erfassungen zu vermeiden …"
              :error="errors.why"
              :disabled="!editable || isSaving || isChecking"
            />
            <DocumentationField
              id="environment"
              v-model="form.environment"
              label="Umfeld"
              compact
              hint="In welchem Umfeld fand die Arbeit statt?"
              placeholder="z. B. Schulprojekt, Praktikum, Berufsalltag …"
              :error="errors.environment"
              :disabled="!editable || isSaving || isChecking"
            />

            <div class="workflow-actions">
              <p
                data-test="save-state"
                role="status"
                class="flex items-center gap-2 text-sm text-base-content/75"
              >
                <UiIcon
                  name="circle-check"
                  :size="18"
                  class="text-primary"
                />
                {{ saveState }}
              </p>
              <div class="flex flex-wrap gap-3">
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
                  {{ isChecking ? 'KI prüft …' : 'Mit KI prüfen' }}
                  <UiIcon
                    v-if="!isChecking"
                    name="arrow-right"
                    :size="19"
                  />
                </UiButton>
              </div>
            </div>
          </form>
        </div>

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
