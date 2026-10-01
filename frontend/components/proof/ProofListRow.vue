<script setup lang="ts">
import { computed } from 'vue'
import type { ProofCard } from '../../types/proof'
import { formatProofDate } from '../../utils/proofStatus'
import ProofStatusBadge from './ProofStatusBadge.vue'
import UiIcon from '../ui/UiIcon.vue'

const props = defineProps<{ card: ProofCard }>()
const target = computed(() => [4, 5].includes(props.card.status)
  ? `/cards/${props.card.id}/result`
  : `/cards/${props.card.id}`)
</script>

<template>
  <NuxtLink
    :to="target"
    class="group grid min-w-[58rem] grid-cols-[minmax(20rem,2fr)_minmax(10rem,1fr)_minmax(12rem,1.1fr)_10rem_2rem] items-center gap-5 border-t border-primary/10 px-5 py-3 transition-colors hover:bg-secondary/55"
    data-test="proof-row"
  >
    <span class="flex min-w-0 items-center gap-3">
      <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/5 text-primary">
        <UiIcon
          name="file-text"
          :size="20"
        />
      </span>
      <span class="min-w-0">
        <strong
          class="block line-clamp-2 font-semibold text-primary"
          :title="`${card.competencyCode} – ${card.competencyDescription}`"
        >
          {{ card.competencyCode }} – {{ card.competencyDescription }}
        </strong>
        <span class="block truncate text-sm text-base-content/55">Karte {{ card.id }} · {{ card.curriculumTitle }}</span>
      </span>
    </span>
    <span
      class="line-clamp-2 text-sm text-base-content/75"
      :title="card.areaTitle"
    >{{ card.areaTitle }}</span>
    <ProofStatusBadge :status="card.status" />
    <time
      :datetime="card.updatedAt"
      class="text-sm text-base-content/60"
    >
      {{ formatProofDate(card.updatedAt) }}
    </time>
    <UiIcon
      name="arrow-right"
      :size="18"
      class="text-primary transition-transform group-hover:translate-x-1"
    />
  </NuxtLink>
</template>
