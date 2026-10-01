<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  current: number
  target: number
}>()

const percentage = computed(() => Math.min(100, Math.round((props.current / props.target) * 100)))
const circumference = 2 * Math.PI * 54
const dashOffset = computed(() => circumference * (1 - percentage.value / 100))
</script>

<template>
  <div
    class="relative grid size-44 shrink-0 place-items-center"
    :aria-label="`${percentage}% des Ziels erreicht`"
  >
    <svg
      class="absolute inset-0 -rotate-90"
      viewBox="0 0 120 120"
      aria-hidden="true"
    >
      <circle
        cx="60"
        cy="60"
        r="54"
        fill="none"
        stroke="currentColor"
        stroke-width="10"
        class="text-base-300/80"
      />
      <circle
        cx="60"
        cy="60"
        r="54"
        fill="none"
        stroke="currentColor"
        stroke-width="10"
        stroke-linecap="round"
        class="text-info"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
    <div class="relative text-center">
      <strong class="block font-display text-4xl text-primary">{{ current }}</strong>
      <span class="text-sm font-semibold text-primary">von {{ target }}</span>
      <span class="mt-1 block text-xs text-base-content/60">Karten abgeschlossen</span>
    </div>
  </div>
</template>
