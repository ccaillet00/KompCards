<script setup lang="ts">
export interface SelectOption {
  value: string | number
  label: string
}

withDefaults(defineProps<{
  id: string
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
}>(), {
  placeholder: 'Bitte auswählen',
  disabled: false,
})

const model = defineModel<string | number | undefined>()
</script>

<template>
  <select
    :id="id"
    v-model="model"
    :disabled="disabled"
    class="form-control-select"
  >
    <option
      :value="undefined"
      disabled
    >
      {{ placeholder }}
    </option>
    <option
      v-for="option in options"
      :key="option.value"
      :value="option.value"
    >
      {{ option.label }}
    </option>
  </select>
</template>
