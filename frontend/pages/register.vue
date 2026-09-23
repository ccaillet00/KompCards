<script setup lang="ts">
import { definePageMeta, navigateTo } from '#imports'

definePageMeta({ middleware: 'service-only' })

await navigateTo('/login?mode=register', {
  redirectCode: 302,
  replace: true,
})
</script>

<template>
  <div />
</template>
