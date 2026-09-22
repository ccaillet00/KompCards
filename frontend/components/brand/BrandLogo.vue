<script setup lang="ts">
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
</script>

<template>
  <NuxtLink
    to="/"
    class="inline-flex items-center gap-3 text-primary"
    aria-label="KompCards Startseite"
  >
    <span class="grid h-12 w-10 place-items-center overflow-hidden rounded-md bg-primary p-1 shadow-sm">
      <img
        src="/brand/kompcards-logo.svg"
        alt=""
        class="size-full object-contain"
      >
    </span>
    <span
      v-if="!compact"
      class="font-display text-2xl font-bold tracking-tight md:text-3xl"
    >KompCards</span>
  </NuxtLink>
</template>
