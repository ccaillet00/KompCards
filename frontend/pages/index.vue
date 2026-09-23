<script setup lang="ts">
import { definePageMeta, useRuntimeConfig, useSeoMeta } from '#imports'
import UiButton from '../components/ui/UiButton.vue'
import UiIcon from '../components/ui/UiIcon.vue'

definePageMeta({ layout: 'public', middleware: 'public-only' })

const config = useRuntimeConfig()

useSeoMeta({
  title: 'KompCards – Kompetenzen sichtbar machen',
  description: 'Dokumentiere deine Arbeit und erstelle daraus strukturierte Kompetenzkarten.',
})

const steps = [
  { icon: 'list-checks', title: 'Kompetenz auswählen', text: 'Wähle die passende Kompetenz aus deinem Lehrplan aus.' },
  { icon: 'notebook-pen', title: 'Arbeit dokumentieren', text: 'Halte fest, was du gemacht hast – konkret und in deinen eigenen Worten.' },
  { icon: 'sparkles', title: 'KI erstellt eine Auswertung', text: 'KompCards strukturiert deine Eingabe und gibt dir hilfreiches Feedback.' },
  { icon: 'badge-check', title: 'Kompetenzkarte abschliessen', text: 'Übernimm die Auswertung oder überarbeite sie gezielt mit deinem Feedback.' },
]

const benefits = [
  { icon: 'lightbulb', title: 'KI als Unterstützung', text: 'Du bekommst eine fachlich strukturierte Auswertung deines Arbeitsergebnisses.' },
  { icon: 'shield-check', title: 'Orientiert am Lehrplan', text: 'Jede Karte bezieht sich auf eine konkrete Kompetenz deines Lehrgangs.' },
  { icon: 'chart-no-axes-column-increasing', title: 'Dein Fortschritt', text: 'Behalte den Überblick über deine erstellten und abgeschlossenen Karten.' },
]
</script>

<template>
  <div>
    <section
      id="ueber-kompcards"
      class="relative isolate min-h-[680px] overflow-hidden border-b border-primary/10 bg-base-100"
    >
      <figure
        data-test="hero-artwork"
        aria-hidden="true"
        class="fox-world-artwork absolute inset-0 -z-20 overflow-hidden"
      >
        <img
          src="/images/fox-world/landing-hero.webp"
          alt=""
          class="hero-artwork-image absolute inset-y-0 right-0 h-full w-auto max-w-none object-contain object-right"
        >
      </figure>
      <div class="hero-artwork-blend absolute inset-0 -z-10" />

      <div class="page-shell flex min-h-[680px] items-center py-20">
        <div class="relative z-10 max-w-2xl lg:max-w-[39rem] xl:max-w-[42rem]">
          <p class="eyebrow mb-5">
            Deine Arbeit. Deine Kompetenz. Deine Zukunft.
          </p>
          <h1 class="display-title max-w-xl xl:max-w-2xl xl:text-6xl">
            Kompetenzen <span class="block">sichtbar machen.</span>
          </h1>
          <p class="mt-6 max-w-lg text-lg leading-8 text-base-content/80 md:text-xl">
            Dokumentiere deine Arbeit, lass dir daraus mit KI eine strukturierte Kompetenzkarte erstellen und zeige, was du kannst.
          </p>
          <div class="mt-8 flex flex-wrap gap-4">
            <UiButton
              :to="`${config.public.serviceUrl}/register`"
              size="lg"
            >
              KompCards entdecken
              <UiIcon
                name="arrow-right"
                :size="20"
              />
            </UiButton>
            <UiButton
              :to="`${config.public.serviceUrl}/login`"
              variant="secondary"
              size="lg"
            >
              <UiIcon
                name="user-round"
                :size="20"
              />
              Einloggen
            </UiButton>
          </div>

          <div class="mt-12 grid max-w-2xl gap-4 border-t border-primary/15 pt-6 text-sm sm:grid-cols-3">
            <div class="flex items-center gap-3">
              <UiIcon
                name="graduation-cap"
                class="text-primary"
              /><span>Für Studierende<br>der Teko HF</span>
            </div>
            <div class="flex items-center gap-3">
              <UiIcon
                name="files"
                class="text-primary"
              /><span>Strukturierte<br>Kompetenzkarten</span>
            </div>
            <div class="flex items-center gap-3">
              <UiIcon
                name="chart-no-axes-column-increasing"
                class="text-primary"
              /><span>Dein Fortschritt<br>auf einen Blick</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      id="so-funktioniert-es"
      class="bg-base-100 py-20 lg:py-24"
    >
      <div class="page-shell">
        <div class="mx-auto max-w-3xl text-center">
          <p class="eyebrow">
            So funktioniert KompCards
          </p>
          <h2 class="section-title mt-3">
            In wenigen Schritten zur Kompetenzkarte.
          </h2>
          <p class="mt-4 text-lg leading-8 text-base-content/70">
            Du dokumentierst deine Arbeit – KompCards hilft dir, daraus einen nachvollziehbaren Kompetenznachweis zu erstellen.
          </p>
        </div>

        <ol class="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <li
            v-for="(step, index) in steps"
            :key="step.title"
            data-test="process-step"
            class="relative rounded-box border border-primary/10 bg-base-100 p-6 text-center shadow-soft"
          >
            <span class="absolute left-5 top-5 grid size-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-content">{{ index + 1 }}</span>
            <span class="mx-auto grid size-16 place-items-center rounded-full bg-secondary text-primary"><UiIcon
              :name="step.icon"
              :size="30"
            /></span>
            <h3 class="mt-5 font-sans text-lg font-bold">
              {{ step.title }}
            </h3>
            <p class="mt-3 text-sm leading-6 text-base-content/65">
              {{ step.text }}
            </p>
          </li>
        </ol>
      </div>
    </section>

    <section
      id="fuer-studierende"
      class="border-y border-primary/10 bg-base-200/70 py-10"
    >
      <div class="page-shell grid gap-8 md:grid-cols-3">
        <article
          v-for="benefit in benefits"
          :key="benefit.title"
          class="flex gap-4 md:border-l md:border-primary/10 md:px-6 md:first:border-l-0"
        >
          <span class="grid size-12 shrink-0 place-items-center rounded-full bg-base-100 text-primary shadow-sm"><UiIcon
            :name="benefit.icon"
            :size="25"
          /></span>
          <div>
            <h3 class="font-sans text-base font-bold">
              {{ benefit.title }}
            </h3>
            <p class="mt-1 text-sm leading-6 text-base-content/65">
              {{ benefit.text }}
            </p>
          </div>
        </article>
      </div>
    </section>

    <section class="relative isolate min-h-[460px] overflow-hidden bg-base-100">
      <figure
        data-test="cta-artwork"
        aria-hidden="true"
        class="fox-world-cta-artwork absolute inset-0 -z-20 overflow-hidden"
      >
        <img
          src="/images/fox-world/landing-hero.webp"
          alt=""
          class="absolute inset-0 size-full object-cover object-[center_62%]"
        >
      </figure>
      <div class="cta-artwork-blend absolute inset-0 -z-10" />
      <div class="page-shell flex min-h-[460px] items-center py-16">
        <div class="max-w-xl">
          <p class="eyebrow">
            Schritt für Schritt weiter
          </p>
          <h2 class="section-title mt-3">
            Heute dokumentieren.<br>Morgen weiterkommen.
          </h2>
          <p class="mt-5 text-lg leading-8 text-base-content/75">
            Erstelle deine erste Kompetenzkarte und mach deinen Fortschritt sichtbar.
          </p>
          <UiButton
            :to="`${config.public.serviceUrl}/register`"
            size="lg"
            class="mt-7"
          >
            KompCards entdecken
            <UiIcon
              name="arrow-right"
              :size="20"
            />
          </UiButton>
        </div>
      </div>
    </section>
  </div>
</template>
