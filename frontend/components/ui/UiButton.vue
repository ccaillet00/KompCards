<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  to?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}>(), {
  to: undefined,
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
})

const classes = computed(() => [
  'btn gap-2 font-semibold normal-case shadow-none',
  {
    'btn-primary': props.variant === 'primary',
    'btn-outline border-primary/40 bg-base-100 text-primary hover:border-primary hover:bg-secondary hover:text-primary': props.variant === 'secondary',
    'btn-ghost text-primary hover:bg-primary/5': props.variant === 'ghost',
    'btn-outline border-error/50 text-error hover:border-error hover:bg-error hover:text-error-content': props.variant === 'danger',
    'btn-sm': props.size === 'sm',
    'btn-lg': props.size === 'lg',
  },
])
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :class="classes"
    :aria-disabled="disabled || undefined"
  >
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :disabled="disabled"
    :class="classes"
  >
    <slot />
  </button>
</template>
