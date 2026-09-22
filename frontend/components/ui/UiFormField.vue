<script setup lang="ts">
defineProps<{
  id: string
  label: string
  hint?: string
  error?: string
}>()
</script>

<template>
  <div class="form-control gap-1.5">
    <label
      :for="id"
      class="text-sm font-semibold text-base-content"
    >
      {{ label }}
    </label>
    <p
      v-if="hint"
      :id="`${id}-hint`"
      class="text-sm leading-relaxed text-base-content/60"
    >
      {{ hint }}
    </p>
    <slot />
    <p
      v-if="error"
      :id="`${id}-error`"
      role="alert"
      class="text-sm text-error"
    >
      {{ error }}
    </p>
  </div>
</template>
