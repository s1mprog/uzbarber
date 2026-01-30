<script setup lang="ts">
import { computed } from "vue"
import type { DayLoad } from "@/types/availability"

const props = defineProps<{
  year: number
  month: number // 1..12
  modelValue?: string | null // YYYY-MM-DD
  loads?: Record<string, DayLoad>
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  "update:modelValue": [val: string]
  select: [val: string]
  prev: []
  next: []
  retry: []
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

const todayKey = computed(() => {
  const t = new Date()
  return ymd(t.getFullYear(), t.getMonth() + 1, t.getDate())
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

function dayLoad(dateKey: string) {
  return props.loads?.[dateKey]
}

function isDisabled(dateKey: string) {
  const load = dayLoad(dateKey)
  return !!load && load.total === 0
}

function pickDate(dateKey: string) {
  if (props.loading) return
  if (props.error) return
  if (isDisabled(dateKey)) return

  emit("update:modelValue", dateKey)
  emit("select", dateKey)
}

function loadBarWidth(dateKey: string) {
  const load = dayLoad(dateKey)
  const percent = load?.loadPercent ?? 0
  return `${percent}%`
}

function freeCount(dateKey: string) {
  return dayLoad(dateKey)?.free ?? 0
}

function isSelected(dateKey: string) {
  return props.modelValue === dateKey
}

function isToday(dateKey: string) {
  return todayKey.value === dateKey
}
</script>

<template>
  <div class="calendar-card">
    <!-- Header -->
    <div class="cal-header">
      <button class="icon-btn" type="button" @click="$emit('prev')" aria-label="Предыдущий месяц" title="Предыдущий месяц">
        ←
      </button>

      <div class="cal-title">
        <div class="cal-title-main">{{ monthTitle }}</div>
        <div class="cal-title-sub">
          <span class="badge ghost" v-if="loading">Загрузка…</span>
          <span class="badge error" v-else-if="error">Ошибка</span>
          <span class="badge" v-else>Выберите день</span>
        </div>
      </div>

      <button class="icon-btn" type="button" @click="$emit('next')" aria-label="Следующий месяц" title="Следующий месяц">
        →
      </button>
    </div>

    <!-- Error / Retry -->
    <div v-if="!loading && error" class="state-card">
      <div class="state-icon">⚠️</div>
      <div class="state-text">
        <p class="state-title">Не удалось загрузить календарь</p>
        <p class="state-subtitle">{{ error }}</p>
      </div>
      <button class="primary-btn" type="button" @click="$emit('retry')">
        Повторить
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="loading" class="skeleton-grid">
      <div class="weekdays">
        <div class="wd">Пн</div><div class="wd">Вт</div><div class="wd">Ср</div>
        <div class="wd">Чт</div><div class="wd">Пт</div><div class="wd">Сб</div>
        <div class="wd">Вс</div>
      </div>

      <div class="grid">
        <div v-for="i in 35" :key="i" class="cell-skeleton"></div>
      </div>
    </div>

    <!-- Calendar -->
    <div v-else class="calendar-body">
      <div class="weekdays">
        <div class="wd">Пн</div><div class="wd">Вт</div><div class="wd">Ср</div>
        <div class="wd">Чт</div><div class="wd">Пт</div><div class="wd">Сб</div>
        <div class="wd">Вс</div>
      </div>

      <div class="grid">
        <div v-for="(cell, idx) in daysGrid" :key="idx">
          <div v-if="cell.type === 'empty'" class="cell-empty"></div>

          <button
            v-else
            type="button"
            class="cell"
            :class="{
              selected: isSelected(cell.key),
              today: isToday(cell.key),
              disabled: isDisabled(cell.key),
            }"
            :disabled="isDisabled(cell.key)"
            @click="pickDate(cell.key)"
          >
            <div class="cell-top">
              <div class="cell-day">{{ cell.day }}</div>
              <div class="cell-free" v-if="!isDisabled(cell.key)">
                {{ freeCount(cell.key) }}
              </div>
            </div>

            <div class="cell-bar">
              <div class="cell-bar-fill" :style="{ width: loadBarWidth(cell.key) }"></div>
            </div>
          </button>
        </div>
      </div>

      <div class="legend">
        <span class="legend-dot"></span>
        <span>цифра — свободные часы</span>
        <span class="legend-sep">•</span>
        <span>полоска — занятость</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-card {
  padding: 14px;
  border-radius: 18px;

  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);

  box-shadow:
    0 12px 34px rgba(0, 0, 0, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

/* Header */
.cal-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}

.cal-title {
  min-width: 0;
  text-align: center;
}

.cal-title-main {
  font-size: 14px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.2px;
  text-transform: capitalize;
}

.cal-title-sub {
  margin-top: 6px;
  display: flex;
  justify-content: center;
}

/* Buttons & badges */
.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  font-size: 18px;
  font-weight: 900;
  color: rgba(15, 23, 42, 0.85);
  display: grid;
  place-items: center;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.icon-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.10);
}
.icon-btn:active {
  transform: translateY(0);
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  padding: 7px 10px;
  border-radius: 999px;

  font-size: 12px;
  font-weight: 900;
  color: #0f172a;

  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
}
.badge.ghost {
  color: rgba(15, 23, 42, 0.55);
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(15, 23, 42, 0.06);
}
.badge.error {
  color: #b91c1c;
  background: rgba(239, 68, 68, 0.10);
  border: 1px solid rgba(239, 68, 68, 0.18);
}

/* Error state card */
.state-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(239, 68, 68, 0.18);
}
.state-icon {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 22px;
  background: rgba(239, 68, 68, 0.10);
  border: 1px solid rgba(239, 68, 68, 0.18);
}
.state-title {
  margin: 0;
  font-size: 13px;
  font-weight: 900;
  color: #0f172a;
}
.state-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.55);
}

/* Primary button */
.primary-btn {
  padding: 10px 14px;
  border-radius: 14px;
  border: none;
  cursor: pointer;

  font-size: 13px;
  font-weight: 900;
  color: #fff;

  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.28);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(102, 126, 234, 0.34);
}
.primary-btn:active {
  transform: translateY(0);
}

/* Weekdays */
.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-top: 10px;
}
.wd {
  text-align: center;
  font-size: 11px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.55);
}

/* Grid */
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-top: 8px;
}

.cell-empty {
  height: 56px;
}

.cell {
  height: 56px;
  width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  padding: 10px 10px 8px;
  transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
}

.cell:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.10);
  border-color: rgba(15, 23, 42, 0.18);
}

.cell:active {
  transform: translateY(0);
}

.cell.selected {
  border-color: rgba(15, 23, 42, 0.55);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.12);
}

.cell.today:not(.selected) {
  border-color: rgba(34, 197, 94, 0.35);
}

.cell.disabled {
  cursor: not-allowed;
  opacity: 0.45;
  transform: none !important;
  box-shadow: none !important;
}

.cell-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 15px;
}

.cell-day {
  font-size: 13px;
  font-weight: 900;
  color: #0f172a;
}

.cell-free {
  font-size: 11px;
  font-weight: 900;
  color: rgba(15, 23, 42, 0.55);
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.cell-bar {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 8px;
  height: 6px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  overflow: hidden;
}
.cell-bar-fill {
  height: 6px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.85);
}

/* Legend */
.legend {
  margin-top: 12px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15);
}
.legend-sep {
  opacity: 0.6;
}

/* Skeleton */
.skeleton-grid .cell-skeleton {
  height: 56px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.08);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

@media (max-width: 375px) {
  .cell-empty { height: 52px; }
  .cell { height: 52px; border-radius: 14px; }
  .grid, .weekdays { gap: 6px; }
}
</style>
