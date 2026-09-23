<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { definePageMeta, useSeoMeta } from '#imports'
import ProofListRow from '../../components/proof/ProofListRow.vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import { useProofs } from '../../composables/useProofs'
import type { ProofStatus } from '../../types/proof'
import { proofStatuses } from '../../utils/proofStatus'

definePageMeta({ middleware: ['service-only', 'auth'] })
useSeoMeta({ title: 'Meine Karten – KompCards' })

const PAGE_SIZE = 10
const { cards, isLoading, error, load } = useProofs()
const activeStatus = ref<'all' | ProofStatus>('all')
const currentPage = ref(1)
const filteredCards = computed(() => activeStatus.value === 'all'
  ? cards.value
  : cards.value.filter(card => card.status === activeStatus.value))
const pageCount = computed(() => Math.max(1, Math.ceil(filteredCards.value.length / PAGE_SIZE)))
const paginatedCards = computed(() => filteredCards.value.slice(
  (currentPage.value - 1) * PAGE_SIZE,
  currentPage.value * PAGE_SIZE,
))
const firstVisible = computed(() => filteredCards.value.length === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1)
const lastVisible = computed(() => Math.min(currentPage.value * PAGE_SIZE, filteredCards.value.length))

function countForStatus(status: ProofStatus): number {
  return cards.value.filter(card => card.status === status).length
}

watch(activeStatus, () => {
  currentPage.value = 1
})

onMounted(load)
</script>

<template>
  <div class="relative isolate min-h-[calc(100vh-5rem)] overflow-hidden">
    <figure
      data-test="page-artwork"
      aria-hidden="true"
      class="absolute inset-0 -z-20 overflow-hidden"
    >
      <img
        src="/images/fox-world/dashboard.webp"
        alt=""
        class="fox-world-page-image absolute inset-y-0 right-0 hidden h-full w-auto max-w-none object-contain object-right lg:block"
      >
    </figure>
    <div class="fox-world-page-blend absolute inset-0 -z-10" />

    <div class="page-shell py-10 xl:py-12">
      <header class="flex max-w-5xl items-start justify-between gap-8">
        <div>
          <h1 class="font-display text-5xl font-bold leading-tight text-primary">
            Meine Karten
          </h1>
          <p class="mt-2 max-w-2xl text-lg leading-7 text-base-content/65">
            Hier findest du alle deine Kompetenzkarten. Wähle eine Karte aus, um sie weiterzubearbeiten oder die Details anzusehen.
          </p>
        </div>
        <UiButton
          to="/cards/new"
          size="lg"
          class="shrink-0"
        >
          <UiIcon
            name="plus"
            :size="20"
          />
          Neue Kompetenzkarte erstellen
        </UiButton>
      </header>

      <div
        class="mt-7 flex max-w-5xl flex-wrap gap-2"
        aria-label="Nach Status filtern"
      >
        <button
          type="button"
          data-test="status-filter-all"
          class="btn btn-sm border-primary/15 font-medium normal-case"
          :class="activeStatus === 'all' ? 'btn-primary' : 'bg-base-100/90 text-primary hover:bg-secondary'"
          @click="activeStatus = 'all'"
        >
          Alle <span class="badge badge-sm">{{ cards.length }}</span>
        </button>
        <button
          v-for="option in proofStatuses"
          :key="option.value"
          type="button"
          :data-test="`status-filter-${option.value}`"
          class="btn btn-sm border-primary/15 font-medium normal-case"
          :class="activeStatus === option.value ? 'btn-primary' : 'bg-base-100/90 text-primary hover:bg-secondary'"
          @click="activeStatus = option.value"
        >
          {{ option.label }} <span class="badge badge-sm">{{ countForStatus(option.value) }}</span>
        </button>
      </div>

      <div
        v-if="error"
        role="alert"
        class="alert alert-error mt-6 max-w-5xl"
      >
        {{ error }}
        <button
          type="button"
          class="btn btn-sm"
          @click="load"
        >
          Erneut versuchen
        </button>
      </div>

      <section
        class="mt-5 max-w-5xl overflow-hidden rounded-box border border-primary/10 bg-base-100/95 shadow-soft backdrop-blur-sm"
        aria-label="Kompetenzkarten"
      >
        <div class="overflow-x-auto">
          <div class="grid min-w-[58rem] grid-cols-[minmax(20rem,2fr)_minmax(10rem,1fr)_minmax(12rem,1.1fr)_10rem_2rem] gap-5 px-5 py-3 text-xs font-bold uppercase tracking-wider text-primary/65">
            <span>Kompetenz</span>
            <span>Bereich</span>
            <span>Status</span>
            <span>Zuletzt bearbeitet</span>
            <span />
          </div>

          <div
            v-if="isLoading && cards.length === 0"
            class="space-y-1 border-t border-primary/10 p-5"
            aria-label="Karten werden geladen"
          >
            <div
              v-for="item in 6"
              :key="item"
              class="skeleton h-14 bg-base-300/60"
            />
          </div>
          <template v-else-if="paginatedCards.length">
            <ProofListRow
              v-for="card in paginatedCards"
              :key="card.id"
              :card="card"
            />
          </template>
          <div
            v-else
            class="border-t border-primary/10 px-6 py-14 text-center"
          >
            <UiIcon
              name="file-text"
              :size="36"
              class="text-primary/45"
            />
            <p class="mt-3 text-base-content/60">
              {{ cards.length ? 'Für diesen Status wurden keine Karten gefunden.' : 'Du hast noch keine Kompetenzkarten erstellt.' }}
            </p>
          </div>
        </div>

        <footer class="flex items-center justify-between border-t border-primary/10 px-5 py-3 text-sm text-base-content/60">
          <span>{{ firstVisible }}–{{ lastVisible }} von {{ filteredCards.length }} Kompetenzkarten</span>
          <div
            v-if="pageCount > 1"
            class="join"
          >
            <button
              type="button"
              class="btn btn-sm join-item"
              :disabled="currentPage === 1"
              aria-label="Vorherige Seite"
              @click="currentPage--"
            >
              ‹
            </button>
            <button
              v-for="page in pageCount"
              :key="page"
              type="button"
              class="btn btn-sm join-item"
              :class="currentPage === page ? 'btn-primary' : ''"
              @click="currentPage = page"
            >
              {{ page }}
            </button>
            <button
              type="button"
              class="btn btn-sm join-item"
              :disabled="currentPage === pageCount"
              aria-label="Nächste Seite"
              @click="currentPage++"
            >
              ›
            </button>
          </div>
        </footer>
      </section>
    </div>
  </div>
</template>
