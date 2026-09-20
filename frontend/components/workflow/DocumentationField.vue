<script setup lang="ts">
import UiTextarea from '../ui/UiTextarea.vue'

defineProps<{
  id: string
  label: string
  hint: string
  placeholder: string
  error?: string
  disabled?: boolean
}>()

const model = defineModel<string>({ default: '' })
</script>

<template>
  <div class="grid gap-3 md:grid-cols-[15rem_minmax(0,1fr)] md:items-start">
    <div>
      <label
        :for="id"
        class="font-semibold text-primary"
      >{{ label }}</label>
      <p class="mt-1 text-sm leading-5 text-base-content/55">
        {{ hint }}
      </p>
    </div>
    <div>
      <UiTextarea
        :id="id"
        v-model="model"
        :placeholder="placeholder"
        :rows="3"
        :disabled="disabled"
        :aria-invalid="Boolean(error) || undefined"
        :aria-describedby="error ? `${id}-error` : undefined"
      />
      <p
        v-if="error"
        :id="`${id}-error`"
        role="alert"
        class="mt-1.5 text-sm text-error"
      >
        {{ error }}
      </p>
    </div>
  </div>
</template>
