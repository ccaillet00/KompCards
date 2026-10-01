<script setup lang="ts">
import { definePageMeta, useRuntimeConfig, useSeoMeta } from '#imports'
const config = useRuntimeConfig()
definePageMeta({ layout: false })
useSeoMeta({ title: 'Informationen – KompCards' })
const sections = [
  { id: 'terms', title: 'Nutzungsbedingungen' },
  { id: 'privacy', title: 'Datenschutzbestimmungen' },
  { id: 'imprint', title: 'Impressum' },
  { id: 'contact', title: 'Kontakt und Support' },
]
</script>
<template>
  <div class="min-h-screen bg-base-100">
    <header class="page-shell border-b border-primary/10 py-6">
      <BrandLogo />
    </header>
    <main class="page-shell py-10">
      <h1 class="section-title">
        Informationen zu KompCards
      </h1>
      <p class="mt-4 max-w-2xl leading-7">
        Diese Informationen sind noch in Ausarbeitung. Es sind derzeit keine freigegebenen Rechtstexte oder Supportkontakte veröffentlicht.
      </p>
      <div class="mt-8 grid max-w-3xl gap-5">
        <section
          v-for="section in sections"
          :id="section.id"
          :key="section.id"
          class="scroll-mt-8 rounded-box border border-primary/15 bg-base-200 p-5"
        >
          <h2 class="text-2xl">
            {{ section.title }}
          </h2>
          <p class="mt-2">
            In Ausarbeitung · noch nicht verfügbar.
          </p>
        </section>
      </div>
      <NuxtLink
        :to="config.public.appMode === 'public' ? '/' : '/login'"
        class="link mt-8 inline-block text-primary"
      >
        Zurück zu KompCards
      </NuxtLink>
    </main>
  </div>
</template>
