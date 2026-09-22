<script setup lang="ts">
import UiIcon from '../ui/UiIcon.vue'

defineProps<{
  code: string
  description: string
  area?: string
}>()
</script>

<template>
  <div class="flex gap-4 rounded-box border border-primary/10 bg-base-100/90 p-5 shadow-soft backdrop-blur-sm">
    <span class="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/5 text-primary">
      <UiIcon
        name="file-text"
        :size="26"
      />
    </span>
    <div>
      <p class="font-semibold text-primary">
        {{ code }} – {{ description }}
      </p>
      <p
        v-if="area"
        class="mt-1 text-sm text-base-content/55"
      >
        {{ area }}
      </p>
      <slot />
    </div>
  </div>
</template>
