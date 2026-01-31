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

  // ✅ NEW: минимально допустимая дата (например todayKey).
  // Если передана — все даты меньше будут disabled.
  minDate?: string | null
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

function isPastByMinDate(dateKey: string) {
  if (!props.minDate) return false
  // YYYY-MM-DD можно сравнивать строками
  return dateKey < props.minDate
}

function isDisabled(dateKey: string) {
  // 1) дни раньше minDate (если задано)
  if (isPastByMinDate(dateKey)) return true

  // 2) если есть load и total=0 — disabled
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

function clampPercent(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

function ringPercent(dateKey: string) {
  const load = dayLoad(dateKey)
  return clampPercent(load?.loadPercent ?? 0)
}

function isSelected(dateKey: string) {
  return props.modelValue === dateKey
}

function isToday(dateKey: string) {
  return todayKey.value === dateKey
}

function isPast(dateKey: string) {
  // purely визуально (для класса)
  return isPastByMinDate(dateKey)
}
</script>

<template>
  <div class="calendar-card">
    <!-- Header -->
    <div class="cal-header">
      <button
        class="icon-btn"
        type="button"
        @click="$emit('prev')"
        aria-label="Предыдущий месяц"
        title="Предыдущий месяц"
      >
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

      <button
        class="icon-btn"
        type="button"
        @click="$emit('next')"
        aria-label="Следующий месяц"
        title="Следующий месяц"
      >
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
        <div v-for="(cell, idx) in daysGrid" :key="idx" class="cell-wrap">
          <div v-if="cell.type === 'empty'" class="cell-empty"></div>

          <button
            v-else
            type="button"
            class="day"
            :class="{
              selected: isSelected(cell.key),
              today: isToday(cell.key),
              disabled: isDisabled(cell.key),
              past: isPast(cell.key),
            }"
            :disabled="isDisabled(cell.key)"
            @click="pickDate(cell.key)"
            :style="{ '--p': String(ringPercent(cell.key)) }"
          >
            <div class="day-inner">
              <div class="day-num">{{ cell.day }}</div>
            </div>
          </button>
        </div>
      </div>

      <div class="legend">
        <span class="legend-ring"></span>
        <span>кольцо — занятость (0–100%)</span>
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
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
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
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--gap);
  margin-top: 10px;
}
.wd {
  text-align: center;
  font-size: 11px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.55);
}

/* Responsive sizing */
.calendar-body {
  --gap: 8px;
}

/* Grid */
.grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--gap);
  margin-top: 8px;
  width: 100%;
  max-width: 100%;
}
.cell-wrap { min-width: 0; }

.cell-empty {
  aspect-ratio: 1 / 1;
  width: 100%;
}

/* Day button */
.day {
  --p: 0;
  width: 100%;
  aspect-ratio: 1 / 1;
  border: 0;
  padding: 0;
  cursor: pointer;
  border-radius: 999px;
  position: relative;
  overflow: hidden;
  background: transparent;
  transition: transform 0.12s ease, filter 0.12s ease;
}
.day:hover { transform: translateY(-1px); }
.day:active { transform: translateY(0); }

.day.disabled {
  cursor: not-allowed;
  opacity: 0.45;
  transform: none !important;
}

/* Optional: чуть сильнее подсветим прошлые дни как "неактивные" */
.day.past:not(.selected) .day-inner {
  filter: grayscale(0.25);
}

/* Ring */
.day::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background:
    conic-gradient(
      rgba(15, 23, 42, 0.85) calc(var(--p) * 1%),
      rgba(15, 23, 42, 0.10) 0
    );
  -webkit-mask: radial-gradient(
    farthest-side,
    transparent calc(100% - 6px),
    #000 calc(100% - 6px)
  );
  mask: radial-gradient(
    farthest-side,
    transparent calc(100% - 6px),
    #000 calc(100% - 6px)
  );
}

.day.disabled::before {
  background:
    conic-gradient(
      rgba(15, 23, 42, 0.18) calc(var(--p) * 1%),
      rgba(15, 23, 42, 0.08) 0
    );
}

.day-inner {
  position: absolute;
  inset: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(15, 23, 42, 0.08);
  display: grid;
  place-items: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.day.today:not(.selected) .day-inner { border-color: rgba(34, 197, 94, 0.35); }

.day.selected .day-inner {
  border-color: rgba(15, 23, 42, 0.55);
  box-shadow:
    0 10px 20px rgba(0, 0, 0, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.day-num {
  font-size: 13px;
  font-weight: 900;
  color: #0f172a;
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
.legend-ring {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: conic-gradient(rgba(15, 23, 42, 0.85) 60%, rgba(15, 23, 42, 0.10) 0);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px));
}

/* Skeleton */
.skeleton-grid { --gap: 8px; }
.skeleton-grid .weekdays { gap: var(--gap); }
.skeleton-grid .grid { gap: var(--gap); }

.cell-skeleton {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

@media (max-width: 420px) {
  .calendar-body { --gap: 6px; }
  .day-inner { inset: 5px; }
  .day::before {
    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 5px));
    mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 5px));
  }
  .day-num { font-size: 12px; }
}

@media (max-width: 360px) {
  .calendar-body { --gap: 5px; }
  .icon-btn { width: 36px; height: 36px; border-radius: 12px; }
  .day-inner { inset: 4px; }
  .day-num { font-size: 11px; }
}
</style>
