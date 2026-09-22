<script setup lang="ts">
import BrandLogo from '../components/brand/BrandLogo.vue'
</script>

<template>
  <div class="relative isolate grid min-h-screen overflow-hidden bg-base-100 lg:grid-cols-[minmax(34rem,46%)_1fr]">
    <figure
      data-test="auth-artwork"
      aria-hidden="true"
      class="absolute inset-0 -z-20 hidden overflow-hidden lg:block"
    >
      <img
        src="/images/fox-world/login/registration.webp"
        alt=""
        class="auth-artwork-image absolute inset-y-0 right-0 h-full w-auto max-w-none object-contain object-right"
      >
    </figure>
    <div class="auth-artwork-blend absolute inset-0 -z-10 hidden lg:block" />

    <div class="relative z-10 flex min-h-screen flex-col px-6 py-7 sm:px-12 lg:px-16 xl:px-24">
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
    />
  </div>
</template>
