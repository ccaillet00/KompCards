<script setup lang="ts">
import BrandLogo from '../components/brand/BrandLogo.vue'
</script>

<template>
  <div class="grid min-h-screen bg-base-100 lg:grid-cols-[minmax(34rem,46%)_1fr]">
    <div class="flex min-h-screen flex-col px-6 py-7 sm:px-12 lg:px-16 xl:px-24">
      <BrandLogo />
      <main class="flex flex-1 items-center py-12">
        <div class="w-full max-w-xl">
          <slot />
        </div>
      </main>
      <footer class="flex flex-wrap gap-5 text-xs text-base-content/50">
        <span>Nutzungsbedingungen</span>
        <span>Datenschutz</span>
        <span>Support</span>
      </footer>
    </div>

    <aside
      class="relative hidden min-h-screen overflow-hidden lg:block"
      aria-label="KompCards Fuchswelt"
    >
      <img
        src="/images/fox-world/login/registration.webp"
        alt="Ein Fuchs blickt auf eine Berglandschaft und seinen Bildungsweg"
        class="absolute inset-0 size-full object-cover object-center"
      >
      <div class="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-base-100 to-transparent" />
    </aside>
  </div>
</template>
