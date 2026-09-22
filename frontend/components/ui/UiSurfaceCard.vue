<script setup lang="ts">
withDefaults(defineProps<{
  as?: 'article' | 'section' | 'div'
  padded?: boolean
}>(), {
  as: 'section',
  padded: true,
})
</script>

<template>
  <component
    :is="as"
    class="rounded-box border border-primary/10 bg-base-100 shadow-soft"
    :class="padded ? 'p-6' : ''"
  >
    <slot />
  </component>
</template>
