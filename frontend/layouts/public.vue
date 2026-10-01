<script setup lang="ts">
import PublicFooter from '../components/navigation/PublicFooter.vue'
import PublicHeader from '../components/navigation/PublicHeader.vue'
</script>

<template>
  <div class="min-h-screen bg-base-100">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-base-100 focus:p-3"
    >Zum Inhalt</a>
    <PublicHeader />
    <main
      id="main-content"
      tabindex="-1"
    >
      <slot />
    </main>
    <PublicFooter />
  </div>
</template>
