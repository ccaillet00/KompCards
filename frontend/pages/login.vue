<script setup lang="ts">
import { computed } from 'vue'
import { definePageMeta, useRoute, useSeoMeta } from '#imports'
import AuthLoginForm from '../components/auth/AuthLoginForm.vue'
import AuthRegisterForm from '../components/auth/AuthRegisterForm.vue'

definePageMeta({ layout: 'auth' })

const route = useRoute()
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

    <Transition
      name="auth-form"
      mode="out-in"
    >
      <AuthRegisterForm v-if="isRegister" />
      <AuthLoginForm v-else />
    </Transition>
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
