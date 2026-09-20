<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ quality: 1 | 2 | 3 | 4 }>()

const label = computed(() => ({
  1: 'Schwach',
  2: 'Verbesserungsbedürftig',
  3: 'Gut',
  4: 'Sehr gut',
})[props.quality])
</script>

<template>
  <div data-test="quality-score">
    <div
      class="flex items-center gap-2"
      aria-hidden="true"
    >
      <span
        v-for="level in 4"
        :key="level"
        class="size-4 rounded-full border border-primary/35"
        :class="level <= quality ? 'bg-primary' : 'bg-base-100'"
      />
    </div>
    <p class="mt-2 font-semibold text-primary">
      {{ quality }} / 4 · {{ label }}
    </p>
  </div>
</template>
