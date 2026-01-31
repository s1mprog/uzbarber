<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useBookingStore } from "@/stores/booking"
import { getBookedHours, getTimeSlots24h } from "@/api/client"

const route = useRoute()
const router = useRouter()
const booking = useBookingStore()

const masterId = computed(() => Number(route.params.id))
const date = computed(() => (route.query.date as string) || booking.date)

const slots = ref<{ start: string; end: string }[]>([])
const bookedSet = ref<Set<string>>(new Set())

const loading = ref(true)
const error = ref<string | null>(null)

// ✅ тикер времени (чтобы обновлять cutoff без перезагрузки страницы)
const nowTick = ref(Date.now())
let timer: number | null = null

const isBooked = (start: string) => bookedSet.value.has(start)

function pad(n: number) {
  return String(n).padStart(2, "0")
}

const todayKey = computed(() => {
  const t = new Date(nowTick.value)
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
})

const isPastDate = computed(() => {
  if (!date.value) return false
  return date.value < todayKey.value
})

const isTodaySelected = computed(() => {
  if (!date.value) return false
  return date.value === todayKey.value
})

function parseSlotMinutes(t: string) {
  // "13:00" or "13:00:00" -> minutes from 00:00
  const parts = String(t || "").split(":")
  const h = Number(parts[0] ?? 0)
  const m = Number(parts[1] ?? 0)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}

const cutoffMinutes = computed(() => {
  // если не сегодня — cutoff не нужен
  if (!isTodaySelected.value) return -1

  const now = new Date(nowTick.value)
  const h = now.getHours()
  const m = now.getMinutes()

  // ✅ если 13:38 -> cutoff = 14:00
  // если 13:00 -> cutoff = 13:00 (можно 13:00 слот)
  const cutoffHour = m > 0 ? h + 1 : h
  return cutoffHour * 60
})

function isPastSlot(start: string) {
  if (isPastDate.value) return true
  if (!isTodaySelected.value) return false
  return parseSlotMinutes(start) < cutoffMinutes.value
}

function isDisabledSlot(start: string) {
  return isBooked(start) || isPastSlot(start)
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace({ name: "ClientMaster", params: { id: masterId.value } })
}

function pickSlot(s: { start: string; end: string }) {
  if (isDisabledSlot(s.start)) return
  booking.setTime(s.start)
  router.push({ name: "ClientContact" })
}

function retry() {
  load()
}

function parseHour(t: string) {
  const parts = String(t || "").split(":")
  const h = Number(parts[0])
  return Number.isFinite(h) ? h : 0
}

const prettyDate = computed(() => {
  const raw = date.value
  if (!raw) return "—"
  const d = new Date(raw + "T00:00:00")
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString("ru-RU", { weekday: "short", day: "2-digit", month: "long" })
})

const grouped = computed(() => {
  const morning: typeof slots.value = []
  const day: typeof slots.value = []
  const evening: typeof slots.value = []

  for (const s of slots.value) {
    const h = parseHour(s.start)
    if (h < 12) morning.push(s)
    else if (h < 18) day.push(s)
    else evening.push(s)
  }

  return [
    { key: "morning", title: "Утро", icon: "sunrise", items: morning },
    { key: "day", title: "День", icon: "sun", items: day },
    { key: "evening", title: "Вечер", icon: "moon", items: evening }
  ]
})

async function load() {
  try {
    loading.value = true
    error.value = null

    if (!date.value) {
      router.replace({ name: "ClientMaster", params: { id: masterId.value } })
      return
    }

    const [allSlots, booked] = await Promise.all([
      getTimeSlots24h(),
      getBookedHours({ masterId: masterId.value, date: date.value })
    ])

    slots.value = allSlots || []
    bookedSet.value = new Set(booked || [])
  } catch (e) {
    console.error(e)
    error.value = "Не удалось загрузить доступное время"
    slots.value = []
    bookedSet.value = new Set()
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await load()

  // ✅ обновляем время раз в 30 секунд (cutoff пересчитается сам)
  timer = window.setInterval(() => {
    nowTick.value = Date.now()
  }, 30_000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <div class="client-time-page">
    <!-- Topbar -->
    <div class="topbar">
      <div class="topbar-card">
        <button class="icon-btn" type="button" @click="goBack" aria-label="Назад" title="Назад">
          <svg class="btn-ic" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div class="topbar-text">
          <div class="topbar-title">
            <span class="mini-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 8v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" stroke-width="2"/>
              </svg>
            </span>
            Выбор времени
          </div>

          <div class="topbar-subtitle">
            <span class="mini-ic sub" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M7 3v3M17 3v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                      stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              </svg>
            </span>
            {{ prettyDate }}
          </div>
        </div>

        <button class="icon-btn" type="button" @click="retry" aria-label="Обновить" title="Обновить">
          <svg class="btn-ic" viewBox="0 0 24 24" fill="none">
            <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M20 4v6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="content">
      <!-- Info card -->
      <div class="glass-card">
        <div class="info-row">
          <div class="info-left">
            <div class="info-title">
              <span class="mini-ic" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z"
                        stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <path d="M12 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
                        stroke="currentColor" stroke-width="2"/>
                </svg>
              </span>
              Выберите удобное время
            </div>

            <div v-if="isTodaySelected" class="info-sub">
              Сейчас: <b>{{ new Date(nowTick).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) }}</b>
              <span class="sep">•</span>
              Доступно с: <b>{{ String(Math.floor(cutoffMinutes/60)).padStart(2,"0") }}:00</b>
            </div>

            <div v-else-if="isPastDate" class="info-sub warn">
              Эта дата уже прошла — время недоступно
            </div>
          </div>

          <div class="info-right">
            <span class="badge">
              <span class="dot"></span>
              {{ slots.length }} слотов
            </span>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="sheet">
        <div class="sheet-card">
          <div class="skeleton-icon"></div>
          <div class="sheet-text">
            <div class="skeleton-line w-60"></div>
            <div class="skeleton-line w-40"></div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="sheet">
        <div class="sheet-card">
          <div class="sheet-icon error">⚠️</div>
          <div class="sheet-text">
            <p class="sheet-title">Ошибка загрузки</p>
            <p class="sheet-subtitle">{{ error }}</p>
          </div>
          <button class="primary-btn" type="button" @click="retry">
            Повторить
          </button>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="slots.length === 0" class="sheet">
        <div class="sheet-card">
          <div class="sheet-icon">🔍</div>
          <div class="sheet-text">
            <p class="sheet-title">Нет доступных слотов</p>
            <p class="sheet-subtitle">Попробуйте другой день.</p>
          </div>
          <button class="primary-btn" type="button" @click="goBack">
            Назад к календарю
          </button>
        </div>
      </div>

      <!-- Slots -->
      <div v-else class="sections">
        <div v-for="g in grouped" :key="g.key" class="section" v-show="g.items.length">
          <div class="section-head">
            <div class="section-title">
              <span class="section-ic" aria-hidden="true">
                <svg v-if="g.icon === 'sunrise'" viewBox="0 0 24 24" fill="none">
                  <path d="M3 17h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M8 17a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M12 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M4.2 10.2l2.8 2.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M19.8 10.2l-2.8 2.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <svg v-else-if="g.icon === 'sun'" viewBox="0 0 24 24" fill="none">
                  <path d="M12 18a6 6 0 1 0-6-6 6 6 0 0 0 6 6Z" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l-1.5-1.5M20.5 20.5 19 19M19 5l1.5-1.5M3.5 20.5 5 19"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none">
                  <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z"
                        stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
              </span>
              {{ g.title }}
            </div>

            <div class="section-hint">
              <span class="hint-dot free"></span> свободно
              <span class="hint-sep">•</span>
              <span class="hint-dot busy"></span> занято/недоступно
            </div>
          </div>

          <div class="grid">
            <button
              v-for="s in g.items"
              :key="s.start"
              class="slot"
              :class="{ booked: isBooked(s.start), past: isPastSlot(s.start) }"
              :disabled="isDisabledSlot(s.start)"
              @click="pickSlot(s)"
              type="button"
            >
              <div class="slot-time">
                <span class="slot-ic" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 8v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </span>
                {{ s.start }} – {{ s.end }}
              </div>

              <div class="slot-status" v-if="isBooked(s.start)">
                Занято
              </div>
              <div class="slot-status past" v-else-if="isPastSlot(s.start)">
                Недоступно
              </div>
              <div class="slot-status free" v-else>
                Свободно
              </div>
            </button>
          </div>
        </div>
      </div>

      <div v-if="!loading && !error && slots.length" class="note">
        Нажмите на свободный слот, чтобы перейти к подтверждению.
      </div>
    </div>
  </div>
</template>

<style scoped>
/* твой стиль + пару добавок */
.client-time-page {
  position: relative;
  width: 100%;
  min-height: 100%;
  background: #f6f7fb;
  padding-bottom: 16px;
}

/* Topbar */
.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 12px 12px 8px;
  background: linear-gradient(180deg, rgba(246, 247, 251, 0.92), rgba(246, 247, 251, 0));
  backdrop-filter: blur(8px);
}

.topbar-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;

  padding: 12px;
  border-radius: 18px;

  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);

  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.topbar-text { min-width: 0; }

.topbar-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.2px;
}

.topbar-subtitle {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 2px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Content */
.content {
  padding: 8px 12px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Glass card */
.glass-card {
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

.info-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
}

.info-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  font-weight: 900;
  color: #0f172a;
}

.info-sub {
  margin-top: 6px;
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.55);
  flex-wrap: wrap;
}
.info-sub .sep { opacity: 0.6; }

.info-sub.warn {
  color: rgba(239, 68, 68, 0.85);
}

/* Mini icons */
.mini-ic {
  width: 16px;
  height: 16px;
  display: inline-flex;
  color: rgba(15, 23, 42, 0.70);
}
.mini-ic svg { width: 16px; height: 16px; }
.mini-ic.sub { color: rgba(15, 23, 42, 0.55); }

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  color: #0f172a;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15);
}

/* Icon btn */
.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  color: rgba(15, 23, 42, 0.85);
  display: grid;
  place-items: center;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.icon-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.10);
}
.icon-btn:active { transform: translateY(0); }
.btn-ic { width: 18px; height: 18px; }

/* Sheet states */
.sheet { position: relative; }
.sheet-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;

  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);

  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.16);
}

.sheet-icon {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 22px;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
}
.sheet-icon.error {
  background: rgba(239, 68, 68, 0.10);
  border-color: rgba(239, 68, 68, 0.18);
}
.sheet-text { min-width: 0; }
.sheet-title { margin: 0; font-size: 14px; font-weight: 900; color: #0f172a; }
.sheet-subtitle { margin: 4px 0 0; font-size: 12px; font-weight: 700; color: rgba(15, 23, 42, 0.55); }

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
.primary-btn:active { transform: translateY(0); }

/* Skeleton */
.skeleton-icon {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.08);
  animation: pulse 1.2s ease-in-out infinite;
}
.skeleton-line {
  height: 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  animation: pulse 1.2s ease-in-out infinite;
  margin: 6px 0;
}
.w-60 { width: 60%; }
.w-40 { width: 40%; }
@keyframes pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

/* Sections */
.sections { display: flex; flex-direction: column; gap: 14px; }

.section {
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

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.section-title {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 14px;
  font-weight: 900;
  color: #0f172a;
}

.section-ic {
  width: 28px;
  height: 28px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
  color: rgba(15, 23, 42, 0.85);
}
.section-ic svg { width: 18px; height: 18px; }

.section-hint {
  font-size: 11px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.55);
  display: flex;
  gap: 8px;
  align-items: center;
  white-space: nowrap;
}

.hint-dot { width: 8px; height: 8px; border-radius: 999px; display: inline-block; }
.hint-dot.free { background: #22c55e; box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15); }
.hint-dot.busy { background: rgba(15, 23, 42, 0.25); box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.08); }
.hint-sep { opacity: 0.6; }

/* Slots grid */
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.slot {
  width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(255, 255, 255, 0.60);
  cursor: pointer;
  padding: 12px 12px;
  transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
  text-align: left;
}

.slot:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.10);
  border-color: rgba(15, 23, 42, 0.18);
}
.slot:active { transform: translateY(0); }

/* ✅ booked */
.slot.booked {
  cursor: not-allowed;
  opacity: 0.50;
  transform: none !important;
  box-shadow: none !important;
}

/* ✅ past (по времени) */
.slot.past {
  cursor: not-allowed;
  opacity: 0.45;
  transform: none !important;
  box-shadow: none !important;
  filter: grayscale(0.25);
}

.slot-time {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 13px;
  font-weight: 900;
  color: #0f172a;
}

.slot-ic {
  width: 18px;
  height: 18px;
  display: inline-flex;
  color: rgba(15, 23, 42, 0.70);
}
.slot-ic svg { width: 18px; height: 18px; }

.slot-status {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.55);
}
.slot-status.free { color: rgba(34, 197, 94, 0.95); }
.slot-status.past { color: rgba(239, 68, 68, 0.85); }

/* Note */
.note {
  margin-top: 2px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.55);
}

@media (max-width: 375px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
