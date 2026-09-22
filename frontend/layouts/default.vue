<script setup lang="ts">
import AppHeader from '../components/navigation/AppHeader.vue'
</script>

<template>
  <div class="min-h-screen bg-base-100">
    <AppHeader />
    <main><slot /></main>
  </div>
</template>
