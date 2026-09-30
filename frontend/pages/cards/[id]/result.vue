<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { definePageMeta, useRoute, useRouter, useSeoMeta } from '#imports'
import ProofStatusBadge from '../../../components/proof/ProofStatusBadge.vue'
import QualityRating from '../../../components/result/QualityRating.vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import CompetencySummary from '../../../components/workflow/CompetencySummary.vue'
import WorkflowSteps from '../../../components/workflow/WorkflowSteps.vue'
import { useCompetencyWorkflow } from '../../../composables/useCompetencyWorkflow'
import { orderOutputRevisions } from '../../../utils/outputRevisions'

definePageMeta({ middleware: ['service-only', 'auth'] })
useSeoMeta({ title: 'LLM-Auswertung – KompCards' })

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
  retryOutput,
  acceptOutput,
  discardProof,
} = useCompetencyWorkflow()

const activeIndex = ref(-1)
const showRetry = ref(false)
const retryFeedback = ref('')
const retryError = ref<string | null>(null)
const showDiscard = ref(false)
const actionMessage = ref<string | null>(null)
const busy = computed(() => isSaving.value || isChecking.value)

const activeInput = computed(() => proof.value?.inputs.reduce(
  (latest, input) => !latest || input.id > latest.id ? input : latest,
  proof.value.inputs[0],
) ?? null)
const orderedOutputs = computed(() => orderOutputRevisions(activeInput.value?.outputs ?? []))
const activeOutput = computed(() => orderedOutputs.value[activeIndex.value] ?? null)
const selectedOutputId = computed(() => orderedOutputs.value.find(output => output.isSaved)?.id ?? null)
const isSelected = computed(() => activeOutput.value?.id === selectedOutputId.value)
const canAct = computed(() => Boolean(activeOutput.value && proof.value?.status === 4))
const canRetry = computed(() => canAct.value && activeIndex.value === orderedOutputs.value.length - 1)
const canConfirm = computed(() => Boolean(
  activeOutput.value
  && !isSelected.value
  && (proof.value?.status === 4 || proof.value?.status === 5),
))

const documentation = computed(() => activeInput.value
  ? [
      { label: 'Rolle', value: activeInput.value.userRole },
      { label: 'Was hast du gemacht?', value: activeInput.value.what },
      { label: 'Wie bist du vorgegangen?', value: activeInput.value.how },
      { label: 'Wozu hast du die Arbeit ausgeführt?', value: activeInput.value.why },
      { label: 'Umfeld', value: activeInput.value.environment },
    ]
  : [])

async function submitRetry(): Promise<void> {
  if (!canRetry.value || busy.value) return
  retryError.value = null
  actionMessage.value = null
  const feedback = retryFeedback.value.trim()
  if (!feedback) {
    retryError.value = 'Bitte beschreibe, was die LLM-Auswertung verbessern soll.'
    return
  }
  if (!activeOutput.value) return

  try {
    const revisedOutput = await retryOutput(activeOutput.value.id, feedback)
    activeInput.value?.outputs.push(revisedOutput)
    activeIndex.value = orderOutputRevisions(activeInput.value?.outputs ?? [])
      .findIndex(output => output.id === revisedOutput.id)
    retryFeedback.value = ''
    showRetry.value = false
    actionMessage.value = 'Die Auswertung wurde mit deinem Feedback neu erstellt.'
  } catch {
    // Der Workflow-Service stellt die API-Fehlermeldung bereit.
  }
}

async function accept(): Promise<void> {
  if (!activeOutput.value || !canConfirm.value || busy.value) return
  actionMessage.value = null
  try {
    const acceptedOutput = await acceptOutput(activeOutput.value.id)
    if (activeInput.value) {
      activeInput.value.outputs = activeInput.value.outputs.map(output => ({
        ...output,
        isSaved: output.id === acceptedOutput.id,
      }))
    }
    if (proof.value) proof.value.status = 5
    actionMessage.value = 'Auswertung übernommen und als aktuelle Auswahl gespeichert.'
  } catch {
    // Der Workflow-Service stellt die API-Fehlermeldung bereit.
  }
}

async function discard(): Promise<void> {
  if (!canAct.value || busy.value) return
  actionMessage.value = null
  try {
    await discardProof(proofId)
    await router.push('/cards')
  } catch {
    // Der Workflow-Service stellt die API-Fehlermeldung bereit.
  }
}

function showPreviousOutput(): void {
  if (activeIndex.value <= 0 || busy.value) return
  activeIndex.value -= 1
  showRetry.value = false
  retryError.value = null
  actionMessage.value = null
}

function showNextOutput(): void {
  if (activeIndex.value >= orderedOutputs.value.length - 1 || busy.value) return
  activeIndex.value += 1
  showRetry.value = false
  retryError.value = null
  actionMessage.value = null
}

onMounted(async () => {
  if (!Number.isSafeInteger(proofId) || proofId < 1) {
    error.value = 'Ungültige Kompetenzkarte.'
    return
  }
  await loadProof(proofId)
  const selectedIndex = orderedOutputs.value.findIndex(output => output.isSaved)
  activeIndex.value = selectedIndex >= 0 ? selectedIndex : orderedOutputs.value.length - 1
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
        class="fox-world-page-image absolute inset-y-0 right-0 hidden h-full w-auto max-w-none object-contain object-right xl:block"
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

      <header class="mt-5 max-w-4xl">
        <p class="text-sm text-base-content/55">
          Kompetenzkarte erstellen&nbsp; › &nbsp;Prüfung
        </p>
        <h1 class="mt-3 font-display text-4xl font-bold leading-tight text-primary sm:text-5xl">
          Auswertung deiner Arbeit
        </h1>
        <p class="mt-2 max-w-3xl text-lg leading-7 text-base-content/65">
          Prüfe die Rückmeldung, überarbeite sie bei Bedarf oder übernimm sie in deine Kompetenzkarte.
        </p>
        <WorkflowSteps
          :current="3"
          class="mt-7"
        />
      </header>

      <div
        v-if="error"
        role="alert"
        class="alert alert-error mt-7 max-w-5xl"
      >
        {{ error }}
      </div>
      <div
        v-if="actionMessage"
        role="status"
        class="alert mt-7 max-w-5xl border border-success/20 bg-success/10 text-success"
      >
        <UiIcon
          name="circle-check"
          :size="20"
        />
        {{ actionMessage }}
      </div>

      <div
        v-if="isLoading"
        class="mt-9 grid max-w-6xl gap-6 lg:grid-cols-2"
        aria-label="Auswertung wird geladen"
      >
        <div
          v-for="item in 2"
          :key="item"
          class="skeleton h-96 bg-base-300/60"
        />
      </div>

      <template v-else-if="activeOutput && activeInput">
        <CompetencySummary
          v-if="competencyContext"
          class="mt-8 max-w-5xl"
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

        <main class="mt-7 grid max-w-6xl gap-6 lg:grid-cols-2 lg:items-start">
          <section class="rounded-box border border-primary/10 bg-base-100/95 p-6 shadow-soft backdrop-blur-sm sm:p-7">
            <div class="flex items-start justify-between gap-4 border-b border-primary/10 pb-5">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary/60">
                  Deine Eingabe
                </p>
                <h2 class="mt-1 font-display text-2xl font-bold text-primary">
                  Deine Dokumentation
                </h2>
              </div>
              <UiButton
                v-if="canAct && !busy"
                :to="`/cards/${proofId}`"
                variant="ghost"
                size="sm"
              >
                <UiIcon
                  name="pencil"
                  :size="16"
                />
                Bearbeiten
              </UiButton>
            </div>

            <dl class="mt-2 divide-y divide-primary/10">
              <div
                v-for="item in documentation"
                :key="item.label"
                class="py-4"
              >
                <dt class="text-sm font-semibold text-primary">
                  {{ item.label }}
                </dt>
                <dd class="mt-1 whitespace-pre-line leading-6 text-base-content/75">
                  {{ item.value }}
                </dd>
              </div>
            </dl>
          </section>

          <section class="overflow-hidden rounded-box border border-primary/15 bg-base-100/95 shadow-soft backdrop-blur-sm">
            <div class="flex items-center justify-between gap-4 bg-primary px-6 py-5 text-primary-content sm:px-7">
              <div class="flex items-center gap-3">
                <span class="grid size-11 place-items-center rounded-full bg-primary-content/15">
                  <UiIcon
                    name="sparkles"
                    :size="24"
                  />
                </span>
                <div>
                  <p class="text-xs font-bold uppercase tracking-[0.16em] opacity-70">
                    KompCards KI
                  </p>
                  <h2 class="font-display text-2xl font-bold text-primary-content">
                    LLM-Auswertung
                  </h2>
                </div>
              </div>
              <div
                v-if="orderedOutputs.length > 1 || isSelected"
                class="flex shrink-0 flex-col items-end gap-2"
              >
                <div
                  v-if="orderedOutputs.length > 1"
                  data-test="output-navigation"
                  class="flex items-center gap-1 rounded-lg bg-primary-content/10 p-1"
                  aria-label="Zwischen LLM-Auswertungen wechseln"
                >
                  <button
                    data-test="previous-output"
                    type="button"
                    class="btn btn-ghost btn-sm min-h-8 size-8 p-0 text-primary-content hover:bg-primary-content/15 disabled:text-primary-content/35"
                    :disabled="activeIndex <= 0 || busy"
                    aria-label="Vorherige Auswertung anzeigen"
                    @click="showPreviousOutput"
                  >
                    <UiIcon
                      name="chevron-left"
                      :size="18"
                    />
                  </button>
                  <span
                    data-test="output-position"
                    class="min-w-12 text-center text-sm font-semibold tabular-nums"
                    aria-live="polite"
                  >
                    {{ activeIndex + 1 }} / {{ orderedOutputs.length }}
                  </span>
                  <button
                    data-test="next-output"
                    type="button"
                    class="btn btn-ghost btn-sm min-h-8 size-8 p-0 text-primary-content hover:bg-primary-content/15 disabled:text-primary-content/35"
                    :disabled="activeIndex >= orderedOutputs.length - 1 || busy"
                    aria-label="Nächste Auswertung anzeigen"
                    @click="showNextOutput"
                  >
                    <UiIcon
                      name="chevron-right"
                      :size="18"
                    />
                  </button>
                </div>
                <span
                  v-if="isSelected"
                  data-test="selected-output"
                  class="inline-flex items-center gap-1.5 rounded-full bg-success px-2.5 py-1 text-xs font-semibold text-white"
                >
                  <UiIcon
                    name="circle-check"
                    :size="15"
                  />
                  Ausgewählt
                </span>
              </div>
            </div>

            <div class="space-y-6 p-6 sm:p-7">
              <div class="grid gap-5 sm:grid-cols-2">
                <div class="rounded-xl bg-primary/5 p-4">
                  <p class="text-sm font-semibold text-primary">
                    Qualität
                  </p>
                  <QualityRating
                    :quality="activeOutput.quality"
                    class="mt-3"
                  />
                </div>
                <div class="rounded-xl bg-primary/5 p-4">
                  <p class="text-sm font-semibold text-primary">
                    Lehrplanbezug
                  </p>
                  <p
                    class="mt-3 flex items-center gap-2 font-semibold"
                    :class="activeOutput.overlapCurriculum ? 'text-success' : 'text-warning'"
                  >
                    <UiIcon
                      :name="activeOutput.overlapCurriculum ? 'circle-check' : 'lightbulb'"
                      :size="20"
                    />
                    {{ activeOutput.overlapCurriculum ? 'Vorhanden' : 'Nicht eindeutig' }}
                  </p>
                </div>
              </div>

              <div>
                <h3 class="font-semibold text-primary">
                  Erkanntes Arbeitsergebnis
                </h3>
                <p class="mt-2 whitespace-pre-line leading-7 text-base-content/75">
                  {{ activeOutput.workResult }}
                </p>
              </div>
              <div class="border-t border-primary/10 pt-5">
                <h3 class="font-semibold text-primary">
                  Begründung der Bewertung
                </h3>
                <p class="mt-2 whitespace-pre-line leading-7 text-base-content/75">
                  {{ activeOutput.qualityStatement }}
                </p>
              </div>
              <div class="rounded-xl border border-secondary bg-secondary/45 p-4">
                <h3 class="flex items-center gap-2 font-semibold text-primary">
                  <UiIcon
                    name="lightbulb"
                    :size="20"
                  />
                  Verbesserungshinweis
                </h3>
                <p class="mt-2 whitespace-pre-line leading-6 text-base-content/75">
                  {{ activeOutput.noteImprovment || 'Keine Verbesserungshinweise.' }}
                </p>
              </div>
            </div>
          </section>
        </main>

        <section
          v-if="showRetry && canRetry"
          class="mt-6 max-w-6xl rounded-box border border-primary/15 bg-base-100/95 p-6 shadow-soft"
        >
          <label
            for="retry-feedback"
            class="font-display text-xl font-bold text-primary"
          >
            Was soll die LLM-Auswertung verbessern?
          </label>
          <p class="mt-1 text-sm text-base-content/60">
            Dein Feedback wird für eine neue Revision der Auswertung verwendet.
          </p>
          <textarea
            id="retry-feedback"
            v-model="retryFeedback"
            maxlength="255"
            rows="3"
            class="textarea textarea-bordered mt-4 w-full bg-base-100 focus:border-primary focus:outline-primary"
            placeholder="z. B. Beschreibe den Praxisbezug und meine Eigenleistung genauer."
          />
          <p
            v-if="retryError"
            class="mt-2 text-sm text-error"
          >
            {{ retryError }}
          </p>
          <div class="mt-4 flex flex-wrap justify-end gap-3">
            <UiButton
              variant="ghost"
              :disabled="busy"
              @click="showRetry = false"
            >
              Abbrechen
            </UiButton>
            <UiButton
              data-test="retry-output"
              :disabled="busy"
              @click="submitRetry"
            >
              <span
                v-if="isChecking"
                class="loading loading-spinner loading-sm"
              />
              {{ isChecking ? 'Wird neu geprüft …' : 'Neu prüfen' }}
            </UiButton>
          </div>
        </section>

        <section
          v-if="showDiscard && canAct"
          class="alert mt-6 max-w-6xl border border-error/25 bg-error/5 text-base-content"
        >
          <UiIcon
            name="trash"
            :size="21"
            class="text-error"
          />
          <div>
            <h3 class="font-semibold text-error">
              Kompetenzkarte wirklich verwerfen?
            </h3>
            <p class="text-sm text-base-content/65">
              Die Karte wird verworfen und erscheint nicht mehr als aktive Kompetenzkarte.
            </p>
          </div>
          <div class="flex gap-2">
            <UiButton
              variant="ghost"
              size="sm"
              :disabled="busy"
              @click="showDiscard = false"
            >
              Abbrechen
            </UiButton>
            <UiButton
              data-test="confirm-discard"
              variant="danger"
              size="sm"
              :disabled="busy"
              @click="discard"
            >
              Verwerfen
            </UiButton>
          </div>
        </section>

        <div
          v-if="canAct || canConfirm"
          class="mt-7 flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-primary/10 pt-6"
        >
          <UiButton
            v-if="canAct"
            data-test="show-discard"
            variant="danger"
            :disabled="isSaving || isChecking"
            @click="showDiscard = true"
          >
            <UiIcon
              name="trash"
              :size="18"
            />
            Karte verwerfen
          </UiButton>
          <div class="flex flex-wrap gap-3">
            <UiButton
              v-if="canRetry"
              data-test="show-retry"
              variant="secondary"
              :disabled="isSaving || isChecking"
              @click="showRetry = true"
            >
              <UiIcon
                name="refresh-cw"
                :size="18"
              />
              Auswertung verbessern
            </UiButton>
            <UiButton
              v-if="canConfirm"
              data-test="accept-output"
              :disabled="isSaving || isChecking"
              @click="accept"
            >
              <span
                v-if="isSaving"
                class="loading loading-spinner loading-sm"
              />
              {{ isSaving ? 'Wird ausgewählt …' : 'Diese Auswertung auswählen' }}
              <UiIcon
                v-if="!isSaving"
                name="arrow-right"
                :size="18"
              />
            </UiButton>
          </div>
        </div>

        <div
          v-if="isSelected"
          class="mt-7 max-w-6xl rounded-box border border-success/20 bg-success/10 p-5 text-success"
        >
          <p class="flex items-center gap-2 font-semibold">
            <UiIcon
              name="circle-check"
              :size="22"
            />
            Diese Auswertung ist für die Kompetenzkarte ausgewählt.
          </p>
          <NuxtLink
            to="/cards"
            class="link mt-2 inline-block text-sm font-semibold"
          >
            Zu meinen Karten
          </NuxtLink>
        </div>
      </template>

      <div
        v-else-if="!isLoading && !error"
        class="mt-9 max-w-3xl rounded-box border border-primary/10 bg-base-100/95 p-8 text-center shadow-soft"
      >
        <UiIcon
          name="sparkles"
          :size="34"
          class="mx-auto text-primary/45"
        />
        <h2 class="mt-4 font-display text-2xl font-bold text-primary">
          Noch keine Auswertung vorhanden
        </h2>
        <p class="mt-2 text-base-content/65">
          Dokumentiere zuerst deine Arbeit und starte anschliessend die LLM-Prüfung.
        </p>
        <UiButton
          :to="`/cards/${proofId}`"
          class="mt-5"
        >
          Zur Dokumentation
        </UiButton>
      </div>
    </div>
  </div>
</template>
