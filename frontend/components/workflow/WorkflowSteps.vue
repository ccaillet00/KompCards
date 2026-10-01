<script setup lang="ts">
const props = defineProps<{ current: 1 | 2 | 3 }>()

const steps = [
  { number: 1, label: 'Kompetenz', description: 'Kompetenz auswählen' },
  { number: 2, label: 'Eingabe', description: 'Arbeit dokumentieren' },
  { number: 3, label: 'Prüfung', description: 'KI-Auswertung' },
] as const
</script>

<template>
  <ol
    class="grid max-w-4xl grid-cols-3"
    aria-label="Fortschritt der Kompetenzkarte"
  >
    <li
      v-for="(step, index) in steps"
      :key="step.number"
      :aria-current="step.number === props.current ? 'step' : undefined"
      :aria-label="`${step.number}. ${step.label}${step.number === props.current ? ' – aktueller Schritt' : ''}`"
      class="relative flex items-start gap-3"
    >
      <span
        v-if="index < steps.length - 1"
        class="absolute left-10 right-0 top-5 h-px bg-primary/25"
        aria-hidden="true"
      />
      <span
        class="relative z-10 grid size-10 shrink-0 place-items-center rounded-full font-semibold"
        :class="step.number <= props.current ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content/55'"
      >
        <UiIcon
          v-if="step.number < props.current"
          name="check"
          :size="19"
        />
        <template v-else>{{ step.number }}</template>
      </span>
      <span class="relative z-10 hidden bg-base-100/80 pr-4 sm:block">
        <strong class="block text-primary">{{ step.label }}</strong>
        <span class="text-sm text-base-content/55">{{ step.description }}</span>
      </span>
    </li>
  </ol>
</template>
