<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { definePageMeta, useRouter, useSeoMeta } from '#imports'
import UiButton from '../components/ui/UiButton.vue'
import UiIcon from '../components/ui/UiIcon.vue'
import UiSurfaceCard from '../components/ui/UiSurfaceCard.vue'
import { useAuth } from '../composables/useAuth'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Profil – KompCards' })

const router = useRouter()
const { user, expiresAt, isLoading, error, logout } = useAuth()
const hydrated = ref(false)
const initials = computed(() => user.value?.name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part[0]?.toUpperCase())
  .join('') || 'KC')
const formattedExpiry = computed(() => expiresAt.value
  ? new Intl.DateTimeFormat('de-CH', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(expiresAt.value))
  : 'Nicht verfügbar')

async function signOut(): Promise<void> {
  await logout()
  await router.push('/login')
}

onMounted(() => {
  hydrated.value = true
})
</script>

<template>
  <div class="relative isolate min-h-[calc(100vh-5rem)] overflow-hidden">
    <img
      src="/images/fox-world/dashboard.webp"
      alt="Fuchs mit Rucksack vor einer Berglandschaft"
      class="absolute inset-y-0 right-0 -z-20 hidden h-full w-[48%] object-cover object-center opacity-80 lg:block"
    >
    <div class="absolute inset-0 -z-10 bg-gradient-to-r from-base-100 via-base-100/95 to-base-100/40" />

    <div class="page-shell py-12 xl:py-14">
      <header class="max-w-2xl">
        <p class="eyebrow">
          Konto
        </p>
        <h1 class="mt-4 font-display text-5xl font-bold leading-tight text-primary xl:text-6xl">
          Dein Profil
        </h1>
        <p class="mt-3 text-xl leading-8 text-base-content/65">
          Hier findest du deine persönlichen Kontodaten und Informationen zur aktuellen Sitzung.
        </p>
      </header>

      <div
        v-if="error"
        role="alert"
        class="alert alert-warning mt-8 max-w-4xl"
      >
        {{ error }}
      </div>

      <main
        v-if="hydrated"
        class="mt-10 grid max-w-4xl gap-5 lg:grid-cols-[1.25fr_0.75fr]"
      >
        <UiSurfaceCard class="bg-base-100/95 p-7 backdrop-blur-sm">
          <div class="flex items-center gap-5 border-b border-primary/10 pb-6">
            <span class="grid size-20 shrink-0 place-items-center rounded-full bg-primary text-2xl font-bold text-primary-content">
              {{ initials }}
            </span>
            <div class="min-w-0">
              <p class="eyebrow">
                Persönliche Daten
              </p>
              <h2 class="mt-1 truncate font-display text-3xl font-bold text-primary">
                {{ user?.name }}
              </h2>
            </div>
          </div>

          <dl class="mt-2 divide-y divide-primary/10">
            <div class="flex items-center gap-4 py-5">
              <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/5 text-primary">
                <UiIcon
                  name="user-round"
                  :size="22"
                />
              </span>
              <div>
                <dt class="text-sm font-medium text-base-content/55">
                  Name
                </dt>
                <dd class="mt-1 font-semibold text-primary">
                  {{ user?.name }}
                </dd>
              </div>
            </div>
            <div class="flex items-center gap-4 py-5">
              <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/5 text-primary">
                <UiIcon
                  name="mail"
                  :size="22"
                />
              </span>
              <div>
                <dt class="text-sm font-medium text-base-content/55">
                  E-Mail-Adresse
                </dt>
                <dd class="mt-1 font-semibold text-primary">
                  {{ user?.email }}
                </dd>
              </div>
            </div>
          </dl>

          <div class="mt-3 rounded-xl border border-info/20 bg-info/10 p-4 text-sm leading-6 text-base-content/70">
            Profiländerungen sind derzeit noch nicht verfügbar. Deine Kontodaten werden aus der Anmeldung übernommen.
          </div>
        </UiSurfaceCard>

        <div class="grid gap-5">
          <UiSurfaceCard class="bg-base-100/95 p-6 backdrop-blur-sm">
            <span class="grid size-12 place-items-center rounded-full bg-success/10 text-success">
              <UiIcon
                name="shield-check"
                :size="24"
              />
            </span>
            <h2 class="mt-4 font-display text-2xl font-bold text-primary">
              Aktuelle Sitzung
            </h2>
            <p class="mt-2 text-sm leading-6 text-base-content/60">
              Automatische Abmeldung spätestens am:
            </p>
            <p class="mt-1 font-semibold text-primary">
              {{ formattedExpiry }}
            </p>
          </UiSurfaceCard>

          <UiSurfaceCard class="bg-base-100/95 p-6 backdrop-blur-sm">
            <h2 class="flex items-center gap-3 font-display text-2xl font-bold text-primary">
              <UiIcon
                name="lock"
                :size="23"
              />
              Konto schützen
            </h2>
            <p class="mt-3 text-sm leading-6 text-base-content/60">
              Melde dich auf gemeinsam genutzten Geräten nach deiner Arbeit vollständig ab.
            </p>
            <UiButton
              data-test="logout"
              variant="secondary"
              class="mt-5 w-full"
              :disabled="isLoading"
              @click="signOut"
            >
              <span
                v-if="isLoading"
                class="loading loading-spinner loading-sm"
              />
              <UiIcon
                v-else
                name="log-out"
                :size="19"
              />
              {{ isLoading ? 'Wird abgemeldet …' : 'Abmelden' }}
            </UiButton>
          </UiSurfaceCard>
        </div>
      </main>
      <div
        v-else
        class="mt-10 grid max-w-4xl gap-5 lg:grid-cols-[1.25fr_0.75fr]"
        aria-label="Profil wird geladen"
      >
        <div class="skeleton h-96 bg-base-300/60" />
        <div class="grid gap-5">
          <div class="skeleton h-44 bg-base-300/60" />
          <div class="skeleton h-52 bg-base-300/60" />
        </div>
      </div>
    </div>
  </div>
</template>
