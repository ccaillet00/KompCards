<script setup lang="ts">
import UiButton from '../ui/UiButton.vue'

defineProps<{
  mode: 'login' | 'register'
  loading: boolean
  disabled: boolean
}>()
defineEmits<{ click: [] }>()
</script>

<template>
  <div class="mt-6">
    <div
      class="mb-5 flex items-center gap-4 text-sm text-base-content/60"
      aria-hidden="true"
    >
      <span class="h-px flex-1 bg-primary/15" />
      oder
      <span class="h-px flex-1 bg-primary/15" />
    </div>
    <UiButton
      data-test="github-auth"
      variant="secondary"
      size="lg"
      class="w-full"
      :disabled="disabled"
      :aria-busy="loading"
      aria-describedby="github-hint"
      @click="$emit('click')"
    >
      <span
        v-if="loading"
        class="loading loading-spinner loading-sm"
        aria-hidden="true"
      />
      {{ loading ? 'Bitte warten …' : mode === 'register' ? 'Mit GitHub registrieren' : 'Mit GitHub anmelden' }}
    </UiButton>
    <p
      id="github-hint"
      class="mt-3 text-sm leading-6 text-base-content/65"
    >
      {{ mode === 'register'
        ? 'Erstelle ein neues Konto ohne Passwort. Bestätige dafür oben die Nutzungsbedingungen und Datenschutzbestimmungen.'
        : 'Für Konten, die mit GitHub erstellt wurden.' }}
    </p>
  </div>
</template>
