<script setup lang="ts">
import BrandLogo from '../brand/BrandLogo.vue'
import UiIcon from '../ui/UiIcon.vue'
</script>

<template>
  <header class="border-b border-primary/10 bg-base-100/95 backdrop-blur">
    <div class="page-shell flex min-h-20 items-center justify-between gap-8">
      <BrandLogo />
      <nav
        class="flex items-center gap-8 text-sm font-medium"
        aria-label="App-Navigation"
      >
        <NuxtLink
          to="/dashboard"
          class="border-b-2 border-transparent py-7 hover:text-primary"
          active-class="border-primary text-primary"
        >
          Dashboard
        </NuxtLink>
        <NuxtLink
          to="/cards"
          class="border-b-2 border-transparent py-7 hover:text-primary"
          active-class="border-primary text-primary"
        >
          Meine Karten
        </NuxtLink>
        <NuxtLink
          to="/profile"
          class="border-b-2 border-transparent py-7 hover:text-primary"
          active-class="border-primary text-primary"
        >
          Profil
        </NuxtLink>
      </nav>
      <button
        type="button"
        class="btn btn-ghost gap-2"
        aria-label="Benutzermenü öffnen"
      >
        <span class="grid size-10 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">KC</span>
        <UiIcon
          name="chevron-down"
          :size="16"
        />
      </button>
    </div>
  </header>
</template>
