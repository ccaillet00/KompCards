<script setup lang="ts">
import { computed } from 'vue'
import { lucideIcons } from '../../utils/lucideIcons'

const props = withDefaults(defineProps<{
  name: string
  label?: string
  size?: number
}>(), {
  label: undefined,
  size: 24,
})

const iconBody = computed(() => lucideIcons[props.name])
</script>

<template>
  <svg
    v-if="iconBody"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    :width="size"
    :height="size"
    :aria-hidden="label ? undefined : 'true'"
    :aria-label="label"
    :role="label ? 'img' : undefined"
    class="inline-block shrink-0"
    v-html="iconBody"
  />
</template>
