<script setup lang="ts">
import { computed } from "vue"
import type { DayLoad } from "@/api/mock/availability"

const props = defineProps<{
  year: number
  month: number // 1..12
  modelValue?: string | null // YYYY-MM-DD
  loads?: Record<string, DayLoad>
}>()

const emit = defineEmits<{
  "update:modelValue": [val: string]
  select: [val: string]
  prev: []
  next: []
}>()

function pad(n: number) {
  return String(n).padStart(2, "0")
}
function ymd(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`
}

const monthTitle = computed(() => {
  const d = new Date(props.year, props.month - 1, 1)
  return d.toLocaleString("ru-RU", { month: "long", year: "numeric" })
})

const daysGrid = computed(() => {
  const first = new Date(props.year, props.month - 1, 1)
  const daysInMonth = new Date(props.year, props.month, 0).getDate()

  // понедельник = 0
  const jsDay = first.getDay() // 0=Sun
  const offset = (jsDay + 6) % 7

  const cells: Array<{ type: "empty" } | { type: "day"; day: number; key: string }> = []
  for (let i = 0; i < offset; i++) cells.push({ type: "empty" })

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ type: "day", day, key: ymd(props.year, props.month, day) })
  }
  return cells
})

function pickDate(dateKey: string) {
  const load = props.loads?.[dateKey]
  if (load && load.total === 0) return

  emit("update:modelValue", dateKey)
  emit("select", dateKey)
}

function loadBarWidth(dateKey: string) {
  const load = props.loads?.[dateKey]
  const percent = load?.loadPercent ?? 0
  return `${percent}%`
}

function freeCount(dateKey: string) {
  return props.loads?.[dateKey]?.free ?? 0
}

function isSelected(dateKey: string) {
  return props.modelValue === dateKey
}
</script>

<template>
  <div class="rounded-2xl bg-white shadow p-4">
    <div class="flex items-center justify-between">
      <button class="px-3 py-2 rounded-xl bg-gray-100" type="button" @click="$emit('prev')">←</button>
      <div class="font-semibold capitalize">{{ monthTitle }}</div>
      <button class="px-3 py-2 rounded-xl bg-gray-100" type="button" @click="$emit('next')">→</button>
    </div>

    <div class="grid grid-cols-7 gap-2 mt-3 text-xs text-gray-500">
      <div class="text-center">Пн</div><div class="text-center">Вт</div><div class="text-center">Ср</div>
      <div class="text-center">Чт</div><div class="text-center">Пт</div><div class="text-center">Сб</div>
      <div class="text-center">Вс</div>
    </div>

    <div class="grid grid-cols-7 gap-2 mt-2">
      <div v-for="(cell, idx) in daysGrid" :key="idx">
        <div v-if="cell.type === 'empty'" class="h-12"></div>

        <button
          v-else
          type="button"
          class="h-12 w-full rounded-xl border relative overflow-hidden text-sm"
          :class="isSelected(cell.key) ? 'border-black' : 'border-gray-200'"
          @click="pickDate(cell.key)"
        >
          <div class="relative z-10">{{ cell.day }}</div>

          <div class="absolute left-0 right-0 bottom-0 h-1 bg-gray-100">
            <div class="h-1 bg-black" :style="{ width: loadBarWidth(cell.key) }"></div>
          </div>

          <div class="absolute right-1 bottom-2 text-[10px] text-gray-500">
            {{ freeCount(cell.key) }}
          </div>
        </button>
      </div>
    </div>

    <div class="mt-3 text-xs text-gray-500">
      Полоска = занятость (0–100%), цифра = свободных часов
    </div>
  </div>
</template>
