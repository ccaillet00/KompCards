<script setup lang="ts">
import { computed } from 'vue'
import type { ProofStatus } from '../../types/proof'

const props = defineProps<{ status: ProofStatus }>()

const statuses: Record<ProofStatus, { label: string, classes: string }> = {
  1: { label: 'Entwurf', classes: 'bg-base-300/70 text-base-content/75' },
  2: { label: 'In Prüfung', classes: 'bg-info/15 text-info' },
  3: { label: 'Prüfung fehlgeschlagen', classes: 'bg-error/15 text-error' },
  4: { label: 'Prüfung abgeschlossen', classes: 'bg-primary/10 text-primary' },
  5: { label: 'Abgeschlossen', classes: 'bg-success/15 text-success' },
  6: { label: 'Verworfen', classes: 'bg-error/10 text-error' },
}

const statusConfig = computed(() => statuses[props.status])
</script>

<template>
  <span
    class="badge h-auto gap-1.5 border-0 px-3 py-1.5 font-medium"
    :class="statusConfig.classes"
  >
    <span
      class="size-1.5 rounded-full bg-current"
      aria-hidden="true"
    />
    {{ statusConfig.label }}
  </span>
</template>
