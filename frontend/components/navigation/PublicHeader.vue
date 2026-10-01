<script setup lang="ts">
import { useRuntimeConfig } from '#imports'
import BrandLogo from '../brand/BrandLogo.vue'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'

const config = useRuntimeConfig()
</script>

<template>
  <header class="border-b border-primary/10 bg-base-100/95 backdrop-blur">
    <div class="page-shell flex min-h-20 flex-wrap items-center justify-between gap-x-4 gap-y-3 py-3 sm:flex-nowrap sm:py-0 lg:gap-x-8">
      <BrandLogo />
      <nav
        class="hidden items-center gap-8 text-sm font-medium text-base-content lg:flex"
        aria-label="Hauptnavigation"
      >
        <a
          href="#ueber-kompcards"
          class="transition-colors hover:text-primary"
        >Über KompCards</a>
        <a
          href="#so-funktioniert-es"
          class="transition-colors hover:text-primary"
        >So funktioniert es</a>
        <a
          href="#fuer-studierende"
          class="transition-colors hover:text-primary"
        >Für Studierende</a>
      </nav>
      <UiButton
        :to="`${config.public.serviceUrl}/login`"
        size="sm"
      >
        <UiIcon
          name="user-round"
          :size="18"
        />
        Einloggen
      </UiButton>
    </div>
  </header>
</template>
