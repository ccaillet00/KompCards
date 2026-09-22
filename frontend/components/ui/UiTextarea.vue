<script setup lang="ts">
withDefaults(defineProps<{
  id: string
  placeholder?: string
  rows?: number
  disabled?: boolean
}>(), {
  placeholder: undefined,
  rows: 4,
  disabled: false,
})

const model = defineModel<string>({ default: '' })
</script>

<template>
  <textarea
    :id="id"
    v-model="model"
    :placeholder="placeholder"
    :rows="rows"
    :disabled="disabled"
    class="form-control-textarea"
  />
</template>
