<script setup lang="ts">
import { ref } from 'vue'
import UiFormField from '../ui/UiFormField.vue'
import UiIcon from '../ui/UiIcon.vue'

defineProps<{
  id: string
  label: string
  placeholder?: string
  autocomplete: 'current-password' | 'new-password'
  error?: string
}>()

const model = defineModel<string>({ default: '' })
const isVisible = ref(false)
</script>

<template>
  <UiFormField
    :id="id"
    :label="label"
    :error="error"
  >
    <div class="relative">
      <input
        :id="id"
        v-model="model"
        :type="isVisible ? 'text' : 'password'"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :aria-invalid="Boolean(error) || undefined"
        :aria-describedby="error ? `${id}-error` : undefined"
        class="form-control-input pr-12"
      >
      <button
        type="button"
        class="btn btn-ghost btn-sm btn-circle absolute right-2 top-1/2 -translate-y-1/2 text-primary"
        :aria-label="isVisible ? 'Passwort ausblenden' : 'Passwort anzeigen'"
        @click="isVisible = !isVisible"
      >
        <UiIcon
          :name="isVisible ? 'eye-off' : 'eye'"
          :size="20"
        />
      </button>
    </div>
  </UiFormField>
</template>
