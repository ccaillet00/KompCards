<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { definePageMeta, navigateTo, useSeoMeta } from '#imports'
import CompetencySummary from '../../components/workflow/CompetencySummary.vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiFormField from '../../components/ui/UiFormField.vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import UiSelect from '../../components/ui/UiSelect.vue'
import { useCompetencyWorkflow } from '../../composables/useCompetencyWorkflow'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Kompetenzkarte erstellen – KompCards' })

const { curricula, isLoading, isSaving, error, loadCurricula, createProof } = useCompetencyWorkflow()
const selectedCurriculumId = ref<number | undefined>()
const selectedAreaId = ref<number | undefined>()
const selectedCompetencyId = ref<number | undefined>()
const selectionError = ref<string | null>(null)

const selectedCurriculum = computed(() => curricula.value.find(item => item.id === selectedCurriculumId.value))
const selectedArea = computed(() => selectedCurriculum.value?.areas.find(item => item.id === selectedAreaId.value))
const selectedCompetency = computed(() => selectedArea.value?.competencies.find(item => item.id === selectedCompetencyId.value))
const curriculumOptions = computed(() => curricula.value.map(item => ({ value: item.id, label: item.titel })))
const areaOptions = computed(() => selectedCurriculum.value?.areas.map(item => ({
  value: item.id,
  label: `${item.code} – ${item.titel}`,
})) ?? [])
const competencyOptions = computed(() => selectedArea.value?.competencies.map(item => ({
  value: item.id,
  label: `${item.code} – ${item.description}`,
})) ?? [])

watch(selectedCurriculumId, () => {
  selectedAreaId.value = undefined
  selectedCompetencyId.value = undefined
})
watch(selectedAreaId, () => {
  selectedCompetencyId.value = undefined
})
watch(selectedCompetencyId, () => {
  selectionError.value = null
})

async function submit(): Promise<void> {
  if (!selectedCompetencyId.value) {
    selectionError.value = 'Bitte wähle eine Kompetenz aus.'
    return
  }
  try {
    const proof = await createProof(selectedCompetencyId.value)
    await navigateTo(`/cards/${proof.id}`)
  } catch {
    // Der Workflow-Service stellt die API-Fehlermeldung bereit.
  }
}

onMounted(async () => {
  await loadCurricula()
  if (curricula.value.length === 1) selectedCurriculumId.value = curricula.value[0]?.id
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
        src="/images/fox-world/competency-select.webp"
        alt=""
        class="fox-world-page-image absolute inset-y-0 right-0 hidden h-full w-auto max-w-none object-contain object-right lg:block"
      >
    </figure>
    <div class="fox-world-page-blend absolute inset-0 -z-10" />

    <div class="page-shell py-12 xl:py-16">
      <main class="max-w-2xl">
        <p class="eyebrow">
          Kompetenzkarte erstellen
        </p>
        <h1 class="mt-4 font-display text-5xl font-bold leading-tight text-primary xl:text-6xl">
          Kompetenzkarte erstellen
        </h1>
        <p class="mt-3 max-w-xl text-xl leading-8 text-base-content/65">
          Wähle die Kompetenz aus, für die du deine Arbeit dokumentieren möchtest.
        </p>

        <div
          v-if="error"
          role="alert"
          class="alert alert-error mt-7"
        >
          {{ error }}
        </div>

        <form
          class="mt-10"
          @submit.prevent="submit"
        >
          <div class="relative space-y-7 pl-16">
            <div
              class="absolute bottom-8 left-5 top-7 w-px bg-primary/20"
              aria-hidden="true"
            />

            <div class="relative">
              <span class="absolute -left-16 top-7 grid size-10 place-items-center rounded-full bg-primary font-semibold text-primary-content">1</span>
              <UiFormField
                id="curriculum"
                label="Lehrgang"
              >
                <UiSelect
                  id="curriculum"
                  v-model="selectedCurriculumId"
                  :options="curriculumOptions"
                  placeholder="Lehrgang auswählen"
                  :disabled="isLoading"
                />
              </UiFormField>
            </div>

            <div class="relative">
              <span
                class="absolute -left-16 top-7 grid size-10 place-items-center rounded-full font-semibold"
                :class="selectedCurriculum ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content/50'"
              >2</span>
              <UiFormField
                id="area"
                label="Bereich"
              >
                <UiSelect
                  id="area"
                  v-model="selectedAreaId"
                  :options="areaOptions"
                  placeholder="Bereich auswählen"
                  :disabled="!selectedCurriculum"
                />
              </UiFormField>
            </div>

            <div class="relative">
              <span
                class="absolute -left-16 top-7 grid size-10 place-items-center rounded-full font-semibold"
                :class="selectedArea ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content/50'"
              >3</span>
              <UiFormField
                id="competency"
                label="Kompetenz"
                :error="selectionError ?? undefined"
              >
                <UiSelect
                  id="competency"
                  v-model="selectedCompetencyId"
                  :options="competencyOptions"
                  placeholder="Kompetenz auswählen"
                  :disabled="!selectedArea"
                />
              </UiFormField>
            </div>
          </div>

          <CompetencySummary
            v-if="selectedCompetency"
            class="ml-16 mt-7"
            :code="selectedCompetency.code"
            :description="selectedCompetency.description"
            :area="selectedArea?.titel"
          />
          <div
            v-else
            class="ml-16 mt-7 flex gap-4 rounded-box bg-base-200/85 p-5 text-base-content/60"
          >
            <UiIcon
              name="file-text"
              :size="28"
              class="shrink-0 text-primary"
            />
            <div>
              <strong class="text-primary">Nach der Auswahl</strong>
              <p class="mt-1 text-sm leading-6">
                Sobald du deine Kompetenz ausgewählt hast, wird hier die Beschreibung angezeigt.
              </p>
            </div>
          </div>

          <div class="mt-8 flex justify-end">
            <UiButton
              type="submit"
              size="lg"
              :disabled="!selectedCompetency || isSaving"
            >
              <span
                v-if="isSaving"
                class="loading loading-spinner loading-sm"
              />
              {{ isSaving ? 'Karte wird erstellt …' : 'Weiter' }}
              <UiIcon
                v-if="!isSaving"
                name="arrow-right"
                :size="20"
              />
            </UiButton>
          </div>
        </form>
      </main>
    </div>
  </div>
</template>
