<script setup lang="ts">
withDefaults(defineProps<{
  id: string
  type?: 'text' | 'email' | 'password'
  placeholder?: string
  disabled?: boolean
}>(), {
  type: 'text',
  placeholder: undefined,
  disabled: false,
})

const model = defineModel<string>({ default: '' })
</script>

<template>
  <input
    :id="id"
    v-model="model"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    class="form-control-input"
  >
</template>
