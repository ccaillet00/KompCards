<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { definePageMeta, useRoute, useSeoMeta } from '#imports'
import { useAuth } from '../composables/useAuth'
import { githubErrorMessage } from '../utils/oauthError'
import AuthLoginForm from '../components/auth/AuthLoginForm.vue'
import AuthRegisterForm from '../components/auth/AuthRegisterForm.vue'

definePageMeta({ layout: 'auth', middleware: ['service-only', 'guest-only'] })

const auth = useAuth()
const showForm = ref(true)
const isRedirecting = ref(false)
const min = 1000;
const max = 1500;
const step = 100;
const randomNumber = Math.floor(Math.random() * ((max - min) / step + 1)) * step + min;
const REDIRECT_DELAY_MS = randomNumber
let redirectTimer: number | undefined

onMounted(async () => {
  await auth.restoreSession(true)
  if (import.meta.client && auth.isAuthenticated.value) {
    showForm.value = false
    isRedirecting.value = true
    redirectTimer = window.setTimeout(() => {
      window.location.href = '/dashboard'
    }, REDIRECT_DELAY_MS)
  }
})

onBeforeUnmount(() => {
  if (redirectTimer) window.clearTimeout(redirectTimer)
})

const route = useRoute()
const oauthError = computed(() => route.query.error ? githubErrorMessage(route.query.error) : null)
const isRegister = computed(() => route.query.mode === 'register')
const title = computed(() => isRegister.value ? 'Konto erstellen' : 'Willkommen zurück')
const description = computed(() => isRegister.value
  ? 'Erstelle dein Konto und starte damit, deine Arbeit zu dokumentieren und strukturierte Kompetenzkarten zu erstellen.'
  : 'Melde dich an, um deine Kompetenzkarten weiterzubearbeiten und deinen Fortschritt sichtbar zu machen.')

useSeoMeta({ title: () => `${title.value} – KompCards` })
</script>

<template>
  <section>
    <p class="eyebrow">
      Deine Arbeit. Deine Kompetenz. Deine Zukunft.
    </p>
    <h1 class="mt-5 font-display text-5xl font-bold leading-tight text-primary sm:text-6xl">
      {{ title }}
    </h1>
    <p class="mt-4 max-w-lg text-lg leading-8 text-base-content/65">
      {{ description }}
    </p>

    <div
      v-if="oauthError"
      data-test="oauth-error"
      role="alert"
      class="alert mt-7 border border-error/20 bg-error/10 text-error"
    >
      {{ oauthError }}
    </div>

    <Transition
      v-if="showForm"
      name="auth-form"
      mode="out-in"
    >
      <AuthRegisterForm v-if="isRegister" />
      <AuthLoginForm v-else />
    </Transition>

    <div
      v-else-if="isRedirecting"
      class="mt-10 flex max-w-lg items-center gap-4 rounded-2xl border border-primary/15 bg-base-100/75 p-5 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <span
        class="loading loading-spinner loading-md shrink-0 text-primary"
        aria-hidden="true"
      />
      <div>
        <p class="font-display text-lg font-semibold text-primary">
          Willkommen zurück
        </p>
        <p class="mt-1 text-sm text-base-content/65">
          Dein Dashboard wird vorbereitet …
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.auth-form-enter-active,
.auth-form-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.auth-form-enter-from {
  opacity: 0;
  transform: translateX(0.75rem);
}

.auth-form-leave-to {
  opacity: 0;
  transform: translateX(-0.75rem);
}

@media (prefers-reduced-motion: reduce) {
  .auth-form-enter-active,
  .auth-form-leave-active {
    transition: none;
  }
}
</style>
