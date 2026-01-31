<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import MonthCalendar from "@/components/MonthCalendar.vue"
import { getMasterOrders, getMasterIdByTelegramId } from "@/api/master"
import { getMonthLoad } from "@/api/client"
import { getTelegramUser } from "@/shared/auth/role"
import { statusBadgeClass, statusLabel, type Order } from "@/types/order"
import type { DayLoad } from "@/types/availability"

const selectedDate = ref("")
const orders = ref<Order[]>([])
const monthLoad = ref<Record<string, DayLoad>>({})
const loading = ref(true)
const error = ref("")
const masterId = ref<number | null>(null)

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth() + 1) // 1..12

const pad = (n: number) => String(n).padStart(2, "0")
function ymd(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`
}
function isSameMonth(dateKey: string, y: number, m: number) {
  return dateKey.startsWith(`${y}-${pad(m)}-`)
}

const todayKey = ymd(now.getFullYear(), now.getMonth() + 1, now.getDate())

// init selectedDate
if (!selectedDate.value) {
  selectedDate.value = isSameMonth(todayKey, currentYear.value, currentMonth.value)
    ? todayKey
    : ymd(currentYear.value, currentMonth.value, 1)
}

const monthTitle = computed(() => {
  const d = new Date(currentYear.value, currentMonth.value - 1, 1)
  return d.toLocaleString("ru-RU", { month: "long", year: "numeric" })
})

const dayOrders = computed(() => {
  if (!selectedDate.value) return []
  return orders.value
    .filter((o) => o.bookingDate === selectedDate.value)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
})

const dayOrdersCount = computed(() => dayOrders.value.length)

let reqToken = 0

async function loadData() {
  const token = ++reqToken
  try {
    loading.value = true
    error.value = ""

    const tgUser = getTelegramUser()
    if (!tgUser?.id) {
      error.value = "Telegram user not found"
      orders.value = []
      monthLoad.value = {}
      return
    }

    const mId = await getMasterIdByTelegramId(tgUser.id)
    if (!mId) {
      error.value = "Master profile not found"
      orders.value = []
      monthLoad.value = {}
      return
    }

    masterId.value = mId

    // 1) Orders
    const list = await getMasterOrders({ masterId: mId })
    if (token !== reqToken) return
    orders.value = list || []

    // 2) Month load
    const loads = await getMonthLoad({
      masterId: mId,
      year: currentYear.value,
      month: currentMonth.value
    })
    if (token !== reqToken) return
    monthLoad.value = loads || {}

    // если selectedDate вышел из текущего месяца — вернём на 1 число
    if (!isSameMonth(selectedDate.value, currentYear.value, currentMonth.value)) {
      selectedDate.value = ymd(currentYear.value, currentMonth.value, 1)
    }
  } catch (err: any) {
    if (token !== reqToken) return
    console.error("Error loading data:", err)
    error.value = "Не удалось загрузить данные"
    orders.value = []
    monthLoad.value = {}
  } finally {
    if (token !== reqToken) return
    loading.value = false
  }
}

function onDateSelect(dateKey: string) {
  selectedDate.value = dateKey
}

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

function formatPretty(dateKey: string) {
  // YYYY-MM-DD
  const [y, m, d] = dateKey.split("-")
  const dt = new Date(Number(y), Number(m) - 1, Number(d))
  return dt.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" })
}

watch([currentYear, currentMonth], () => {
  loadData()
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page">
    <!-- Topbar -->
    <div class="topbar">
      <div class="topbar-card">
        <button class="icon-btn" type="button" @click="prevMonth" aria-label="Предыдущий месяц" title="Предыдущий месяц">
          <svg class="btn-ic" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div class="topbar-text">
          <div class="topbar-title">Календарь</div>
          <div class="topbar-subtitle">
            <span v-if="loading">Загрузка…</span>
            <span v-else-if="error">Есть проблема</span>
            <span v-else class="cap">{{ monthTitle }}</span>
          </div>
        </div>

        <div class="right-actions">
          <button class="icon-btn" type="button" @click="loadData" :disabled="loading" aria-label="Обновить" title="Обновить">
            <svg class="btn-ic" viewBox="0 0 24 24" fill="none">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M21 3v6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <button class="icon-btn" type="button" @click="nextMonth" aria-label="Следующий месяц" title="Следующий месяц">
            <svg class="btn-ic" viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="content">
      <!-- Error -->
      <div v-if="!loading && error" class="state-card">
        <div class="state-icon">⚠️</div>
        <div class="state-text">
          <p class="state-title">Не удалось загрузить календарь</p>
          <p class="state-subtitle">{{ error }}</p>
        </div>
        <button class="primary-btn" type="button" @click="loadData">Повторить</button>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="glass-card">
        <div class="skeleton-line w-60"></div>
        <div class="skeleton-line w-80"></div>
        <div class="skeleton-line w-70"></div>
      </div>

      <template v-else>
        <!-- Calendar -->
        <MonthCalendar
          v-model="selectedDate"
          :year="currentYear"
          :month="currentMonth"
          :loads="monthLoad"
          @select="onDateSelect"
          @prev="prevMonth"
          @next="nextMonth"
        />

        <!-- Orders -->
        <div class="glass-card">
          <div class="day-head">
            <div class="day-title">
              {{ selectedDate ? formatPretty(selectedDate) : "Выберите день" }}
            </div>
            <span class="count-pill" v-if="selectedDate">
              {{ dayOrdersCount }}
            </span>
          </div>

          <div v-if="!selectedDate" class="muted-center">
            Выберите день в календаре
          </div>

          <div v-else-if="dayOrders.length === 0" class="muted-center">
            На этот день заказов нет
          </div>

          <div v-else class="list">
            <div v-for="o in dayOrders" :key="o.id" class="order-card">
              <div class="order-head">
                <div class="order-main">
                  <div class="order-time">{{ o.startTime }}</div>
                  <div class="order-name">{{ o.clientName }}</div>
                </div>
                <span class="badge-pill" :class="statusBadgeClass(o.status)">
                  {{ statusLabel(o.status) }}
                </span>
              </div>

              <div class="row">
                <span class="muted">Телефон</span>
                <b>{{ o.clientPhone || "—" }}</b>
              </div>

              <div v-if="o.comment" class="comment">💬 {{ o.comment }}</div>

              <div class="row">
                <span class="muted">Длительность</span>
                <b>{{ o.durationMinutes }} мин</b>
              </div>

              <div class="row">
                <span class="muted">Сумма</span>
                <b>{{ o.price.toLocaleString() }} сум</b>
              </div>
            </div>
          </div>
        </div>

        <div class="bottom-space"></div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  width: 100%;
  min-height: 100%;
  background: #f6f7fb;
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
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.topbar-text { min-width: 0; text-align: center; }
.topbar-title { font-size: 14px; font-weight: 900; color: #0f172a; letter-spacing: -0.2px; }
.topbar-subtitle { margin-top: 2px; font-size: 12px; font-weight: 800; color: rgba(15, 23, 42, 0.55); }
.cap { text-transform: capitalize; }

.right-actions {
  display: inline-flex;
  gap: 10px;
  align-items: center;
}

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
}
.icon-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ic { width: 18px; height: 18px; }

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
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

/* Orders block */
.day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.day-title {
  font-size: 13px;
  font-weight: 900;
  color: #0f172a;
}
.count-pill {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  color: #0f172a;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.muted-center {
  text-align: center;
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.55);
  padding: 14px 0;
}

.list { display: flex; flex-direction: column; gap: 10px; }

.order-card {
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.order-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.order-main { min-width: 0; }
.order-time { font-size: 16px; font-weight: 900; color: #0f172a; }
.order-name { margin-top: 3px; font-size: 13px; font-weight: 800; color: rgba(15, 23, 42, 0.75); }

.badge-pill { display: inline-block; font-size: 12px; font-weight: 900; padding: 6px 10px; border-radius: 999px; }

.row {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.75);
}
.row b { color: #0f172a; font-weight: 900; text-align: right; }
.muted { color: rgba(15, 23, 42, 0.55); }

.comment {
  margin-top: 10px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  padding: 10px;
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
  white-space: pre-wrap;
}

/* Error state */
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
.state-title { margin: 0; font-size: 13px; font-weight: 900; color: #0f172a; }
.state-subtitle { margin: 4px 0 0; font-size: 12px; font-weight: 700; color: rgba(15, 23, 42, 0.55); line-height: 1.2; }
.primary-btn {
  padding: 10px 14px;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Skeleton */
.skeleton-line {
  height: 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  animation: pulse 1.2s ease-in-out infinite;
  margin: 8px 0;
}
.w-60 { width: 60%; }
.w-80 { width: 80%; }
.w-70 { width: 70%; }
@keyframes pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }

.bottom-space { height: 90px; }
</style>
