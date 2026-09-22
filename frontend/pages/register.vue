<script setup lang="ts">
import { navigateTo } from '#imports'

await navigateTo('/login?mode=register', {
  redirectCode: 302,
  replace: true,
})
</script>

<template>
  <div />
</template>
