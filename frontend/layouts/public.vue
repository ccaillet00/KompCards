<script setup lang="ts">
import PublicFooter from '../components/navigation/PublicFooter.vue'
import PublicHeader from '../components/navigation/PublicHeader.vue'
</script>

<template>
  <div class="min-h-screen bg-base-100">
    <PublicHeader />
    <main><slot /></main>
    <PublicFooter />
  </div>
</template>
