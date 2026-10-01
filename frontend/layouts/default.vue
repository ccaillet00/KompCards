<script setup lang="ts">
import AppHeader from '../components/navigation/AppHeader.vue'
</script>

<template>
  <div class="min-h-screen bg-base-100">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-base-100 focus:p-3"
    >Zum Inhalt</a>
    <AppHeader />
    <main
      id="main-content"
      tabindex="-1"
    >
      <slot />
    </main>
  </div>
</template>
