<script setup lang="ts">
import BrandLogo from '../brand/BrandLogo.vue'
</script>

<template>
  <footer class="border-t border-primary/10 bg-base-100 py-8">
    <div class="page-shell flex flex-col items-center justify-between gap-6 md:flex-row">
      <BrandLogo />
      <nav
        class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-base-content/70"
        aria-label="Fussnavigation"
      >
        <a
          href="#ueber-kompcards"
          class="hover:text-primary"
        >Über KompCards</a>
        <NuxtLink
          to="/information#privacy"
          class="link"
        >
          Datenschutz · in Ausarbeitung
        </NuxtLink>
        <NuxtLink
          to="/information#imprint"
          class="link"
        >
          Impressum · in Ausarbeitung
        </NuxtLink>
        <NuxtLink
          to="/information#contact"
          class="link"
        >
          Kontakt · in Ausarbeitung
        </NuxtLink>
      </nav>
      <p class="text-sm text-base-content/55">
        Kompetenzen heute. Chancen morgen.
      </p>
    </div>
  </footer>
</template>
