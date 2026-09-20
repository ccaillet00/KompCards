<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { definePageMeta, useSeoMeta } from '#imports'
import ProofProgressRing from '../components/proof/ProofProgressRing.vue'
import ProofStatusBadge from '../components/proof/ProofStatusBadge.vue'
import UiButton from '../components/ui/UiButton.vue'
import UiIcon from '../components/ui/UiIcon.vue'
import UiSurfaceCard from '../components/ui/UiSurfaceCard.vue'
import { useProofs } from '../composables/useProofs'
import { formatProofDate } from '../utils/proofStatus'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Dashboard – KompCards' })

const TARGET_COUNT = 45
const { cards, isLoading, error, load } = useProofs()
const createdCount = computed(() => cards.value.length)
const completedCount = computed(() => cards.value.filter(card => card.status === 5).length)
const activeCount = computed(() => cards.value.filter(card => card.status >= 1 && card.status <= 4).length)
const latestCard = computed(() => cards.value[0] ?? null)
const progress = computed(() => Math.min(100, Math.round((createdCount.value / TARGET_COUNT) * 100)))
const remainingCount = computed(() => Math.max(0, TARGET_COUNT - createdCount.value))

onMounted(load)
</script>

<template>
  <div class="relative isolate min-h-[calc(100vh-5rem)] overflow-hidden">
    <img
      src="/images/fox-world/dashboard.webp"
      alt="Fuchs mit Rucksack vor einer Berglandschaft"
      class="absolute inset-y-0 right-0 -z-20 hidden h-full w-[58%] object-cover object-center lg:block"
    >
    <div class="absolute inset-0 -z-10 bg-gradient-to-r from-base-100 via-base-100/95 to-base-100/10" />

    <div class="page-shell py-12 xl:py-14">
      <header class="max-w-2xl">
        <p class="eyebrow">
          Willkommen zurück
        </p>
        <h1 class="mt-4 font-display text-5xl font-bold leading-tight text-primary xl:text-6xl">
          Dein Fortschritt zählt.
        </h1>
        <p class="mt-3 text-xl leading-8 text-base-content/65">
          Erstelle und sammle deine Kompetenzkarten – und dokumentiere, was du kannst.
        </p>
      </header>

      <div
        v-if="error"
        role="alert"
        class="alert alert-error mt-8 max-w-4xl"
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

      <div
        v-if="isLoading && cards.length === 0"
        class="mt-10 grid max-w-4xl gap-5 md:grid-cols-2"
        aria-label="Dashboard wird geladen"
      >
        <div
          v-for="item in 4"
          :key="item"
          class="skeleton h-56 bg-base-300/60"
        />
      </div>

      <div
        v-else
        class="mt-10 grid max-w-5xl gap-5 lg:grid-cols-[1.45fr_0.85fr]"
      >
        <UiSurfaceCard class="bg-base-100/95 p-7 backdrop-blur-sm">
          <h2 class="flex items-center gap-3 font-display text-2xl font-bold text-primary">
            <UiIcon
              name="chart-no-axes-column-increasing"
              :size="26"
            />
            Dein Fortschritt
          </h2>
          <div class="mt-5 flex flex-col items-center gap-6 sm:flex-row">
            <ProofProgressRing
              :current="createdCount"
              :target="TARGET_COUNT"
            />
            <div class="grid flex-1 gap-3">
              <div
                data-test="completed-count"
                class="flex items-center gap-4 rounded-xl bg-success/10 p-4"
              >
                <span class="grid size-11 place-items-center rounded-full bg-success text-success-content">
                  <UiIcon
                    name="circle-check"
                    :size="22"
                  />
                </span>
                <span>
                  <strong class="block text-2xl text-primary">{{ completedCount }}</strong>
                  <span class="text-sm text-base-content/65">Abgeschlossen</span>
                </span>
              </div>
              <div
                data-test="created-count"
                class="flex items-center gap-4 rounded-xl bg-info/10 p-4"
              >
                <span class="grid size-11 place-items-center rounded-full bg-info text-info-content">
                  <UiIcon
                    name="file-text"
                    :size="22"
                  />
                </span>
                <span>
                  <strong class="block text-2xl text-primary">{{ createdCount }}</strong>
                  <span class="text-sm text-base-content/65">Karten erstellt · {{ activeCount }} in Arbeit</span>
                </span>
              </div>
            </div>
          </div>
          <div class="mt-6 flex items-center gap-4">
            <progress
              class="progress progress-info h-3 flex-1"
              :value="progress"
              max="100"
            />
            <strong class="text-primary">{{ progress }} %</strong>
          </div>
        </UiSurfaceCard>

        <UiSurfaceCard class="flex flex-col justify-center bg-base-100/95 p-7 backdrop-blur-sm">
          <span class="grid size-14 place-items-center rounded-full bg-primary text-primary-content">
            <UiIcon
              name="plus"
              :size="30"
            />
          </span>
          <h2 class="mt-5 font-display text-2xl font-bold text-primary">
            Neue Kompetenzkarte erstellen
          </h2>
          <p class="mt-2 leading-7 text-base-content/65">
            Dokumentiere eine neue Arbeit und lass deine Kompetenz vom KI-Assistenten prüfen.
          </p>
          <UiButton
            to="/cards/new"
            size="lg"
            class="mt-6 w-full"
          >
            Jetzt starten
            <UiIcon
              name="arrow-right"
              :size="19"
            />
          </UiButton>
        </UiSurfaceCard>

        <UiSurfaceCard class="bg-base-100/95 p-7 backdrop-blur-sm">
          <div class="flex items-center justify-between gap-4">
            <h2 class="flex items-center gap-3 font-display text-2xl font-bold text-primary">
              <UiIcon
                name="clock"
                :size="26"
              />
              Zuletzt bearbeitet
            </h2>
            <NuxtLink
              v-if="latestCard"
              :to="`/cards/${latestCard.id}`"
              class="text-sm font-semibold text-primary"
            >
              Zur Karte →
            </NuxtLink>
          </div>
          <NuxtLink
            v-if="latestCard"
            :to="`/cards/${latestCard.id}`"
            data-test="latest-card"
            class="mt-5 flex items-center gap-4 rounded-xl bg-base-200/80 p-5 transition-colors hover:bg-secondary"
          >
            <span class="grid size-12 shrink-0 place-items-center rounded-lg bg-base-100 text-primary">
              <UiIcon
                name="file-text"
                :size="25"
              />
            </span>
            <span class="min-w-0 flex-1">
              <strong class="block truncate text-primary">
                {{ latestCard.competencyCode }} – {{ latestCard.competencyDescription }}
              </strong>
              <span class="mt-1 block text-sm text-base-content/60">
                {{ latestCard.areaTitle }} · {{ formatProofDate(latestCard.updatedAt) }}
              </span>
            </span>
            <ProofStatusBadge :status="latestCard.status" />
          </NuxtLink>
          <div
            v-else
            data-test="latest-card"
            class="mt-5 rounded-xl bg-base-200/80 p-5 text-base-content/60"
          >
            Du hast noch keine Kompetenzkarte erstellt.
          </div>
        </UiSurfaceCard>

        <UiSurfaceCard class="flex flex-col justify-center bg-base-100/95 p-7 backdrop-blur-sm">
          <h2 class="flex items-center gap-3 font-display text-2xl font-bold text-primary">
            <UiIcon
              name="graduation-cap"
              :size="27"
            />
            Nächster Schritt
          </h2>
          <p class="mt-3 leading-7 text-base-content/65">
            <template v-if="remainingCount > 0">
              Noch {{ remainingCount }} Kompetenzkarten bis zu deinem Ziel. Bleib dran – jede dokumentierte Arbeit bringt dich weiter.
            </template>
            <template v-else>
              Du hast das Ziel von {{ TARGET_COUNT }} Kompetenzkarten erreicht.
            </template>
          </p>
          <UiButton
            v-if="latestCard"
            :to="`/cards/${latestCard.id}`"
            variant="secondary"
            class="mt-5 w-full"
          >
            Letzte Karte öffnen
          </UiButton>
          <UiButton
            to="/cards/new"
            variant="ghost"
            class="mt-2 w-full"
          >
            Neue Karte erstellen
          </UiButton>
        </UiSurfaceCard>
      </div>
    </div>
  </div>
</template>
