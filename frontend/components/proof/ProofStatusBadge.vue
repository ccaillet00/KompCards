<script setup lang="ts">
import { computed } from 'vue'
import { proofStatuses } from '../../utils/proofStatus'
import type { ProofStatus } from '../../types/proof'

const props = defineProps<{ status: ProofStatus }>()

const statusClasses: Record<ProofStatus, string> = {
  1: 'bg-base-300/70 text-base-content/75',
  2: 'bg-info/15 text-info',
  3: 'bg-error/15 text-error',
  4: 'bg-primary/10 text-primary',
  5: 'bg-success/15 text-success',
  6: 'bg-error/10 text-error',
}

const statusConfig = computed(() => ({ label: proofStatuses.find(status => status.value === props.status)?.label, classes: statusClasses[props.status] }))
</script>

<template>
  <span
    class="badge h-auto shrink-0 gap-1.5 border-0 px-3 py-1.5 font-medium"
    :class="statusConfig.classes"
  >
    <span
      class="size-1.5 rounded-full bg-current"
      aria-hidden="true"
    />
    {{ statusConfig.label }}
  </span>
</template>
