<script setup lang="ts">
import BrandLogo from '../brand/BrandLogo.vue'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'
</script>

<template>
  <header class="border-b border-primary/10 bg-base-100/95 backdrop-blur">
    <div class="page-shell flex min-h-20 items-center justify-between gap-8">
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
        to="/login"
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
