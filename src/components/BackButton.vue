<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label?: string
  }>(),
  { label: "Назад" }
)

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm hover:opacity-95"
    @click="$emit('click')"
  >
    ← {{ props.label }}
  </button>
</template>
