<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useBookingStore } from "@/stores/booking"
import MonthCalendar from "@/components/MonthCalendar.vue"
import { getMasterById, getMonthLoad } from "@/api/client"
import type { DayLoad } from "@/types/availability"

const route = useRoute()
const router = useRouter()
const booking = useBookingStore()

const masterId = computed(() => Number(route.params.id))

const master = ref<any>(null)

const now = new Date()
const calYear = ref(now.getFullYear())
const calMonth = ref(now.getMonth() + 1)

const loads = ref<Record<string, DayLoad>>({})
const selectedDate = ref<string | null>(null)

const loadingMaster = ref(true)
const loadingMonth = ref(true)
const error = ref<string | null>(null)

let masterReqToken = 0
let monthReqToken = 0

function pad(n: number) {
  return String(n).padStart(2, "0")
}
const todayKey = computed(() => {
  const t = new Date()
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
})

async function loadMonth() {
  const token = ++monthReqToken
  try {
    loadingMonth.value = true
    error.value = null

    const data = await getMonthLoad({
      masterId: masterId.value,
      year: calYear.value,
      month: calMonth.value
    })

    if (token !== monthReqToken) return
    loads.value = data || {}
  } catch (e) {
    if (token !== monthReqToken) return
    console.error(e)
    error.value = "Не удалось загрузить календарь"
    loads.value = {}
  } finally {
    if (token !== monthReqToken) return
    loadingMonth.value = false
  }
}

async function loadMaster(id: number) {
  const token = ++masterReqToken
  try {
    loadingMaster.value = true
    error.value = null

    booking.setMaster(id)
    const m = await getMasterById(id)

    if (token !== masterReqToken) return
    master.value = m
  } catch (e) {
    if (token !== masterReqToken) return
    console.error(e)
    error.value = "Не удалось загрузить данные мастера"
    master.value = null
  } finally {
    if (token !== masterReqToken) return
    loadingMaster.value = false
  }
}

async function loadMasterAndMonth(id: number) {
  await loadMaster(id)
  await loadMonth()
}

function prevMonth() {
  if (calMonth.value === 1) {
    calMonth.value = 12
    calYear.value -= 1
  } else calMonth.value -= 1
}

function nextMonth() {
  if (calMonth.value === 12) {
    calMonth.value = 1
    calYear.value += 1
  } else calMonth.value += 1
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace({ name: "ClientMap" })
}

function retryAll() {
  const id = masterId.value
  if (!Number.isFinite(id)) return
  loadMasterAndMonth(id)
}

watch(
  masterId,
  async (id) => {
    if (!Number.isFinite(id)) return
    await loadMasterAndMonth(id)
  },
  { immediate: true }
)

watch([calYear, calMonth], async () => {
  if (!Number.isFinite(masterId.value)) return
  await loadMonth()
})

watch(
  selectedDate,
  (d) => {
    if (!d) return
    booking.setDate(d)
    router.push({
      name: "ClientTime",
      params: { id: masterId.value },
      query: { date: d }
    })
  },
  { flush: "post" }
)

const titleName = computed(() => master.value?.name || `Master #${masterId.value}`)
const addressText = computed(() => master.value?.address || "—")
const ratingText = computed(() => (master.value?.rating ? String(master.value.rating) : null))
</script>

<template>
  <div class="client-master-page">
    <!-- Top glass header -->
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
                <path d="M7 3v3M17 3v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                      stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              </svg>
            </span>
            Запись
          </div>

          <div class="topbar-subtitle">
            <span class="mini-ic sub" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 8v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" stroke-width="2"/>
              </svg>
            </span>
            Выберите день и время
          </div>
        </div>

        <button class="icon-btn" type="button" @click="retryAll" aria-label="Обновить" title="Обновить">
          <svg class="btn-ic" viewBox="0 0 24 24" fill="none">
            <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M20 4v6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="content">
      <!-- Master card -->
      <div class="glass-card">
        <div class="master-row">
          <div class="master-main">
            <h1 class="master-name">
              <span v-if="loadingMaster" class="skeleton-line w-60"></span>
              <span v-else>
                <span class="mini-ic brand" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M20.59 13.41 12 22l-9-9V3h10l7.59 7.59a2 2 0 0 1 0 2.82Z"
                          stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M7 7h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </span>
                {{ titleName }}
              </span>
            </h1>

            <p class="master-address">
              <span v-if="loadingMaster" class="skeleton-line w-40"></span>
              <span v-else class="addr-row">
                <span class="mini-ic pin" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z"
                          stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M12 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
                          stroke="currentColor" stroke-width="2"/>
                  </svg>
                </span>
                {{ addressText }}
              </span>
            </p>
          </div>

          <div class="master-meta">
            <span v-if="!loadingMaster && ratingText" class="badge">
              ⭐ {{ ratingText }}
            </span>
          </div>
        </div>
      </div>

      <MonthCalendar
        :year="calYear"
        :month="calMonth"
        v-model="selectedDate"
        :loads="loads"
        :loading="loadingMonth"
        :error="error"
        :minDate="todayKey"  
        @prev="prevMonth"
        @next="nextMonth"
        @retry="loadMonth"
      />
    </div>
  </div>
</template>

<style scoped>
/* твой стиль без изменений */
.client-master-page {
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

  padding: 12px 12px;
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

.master-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: start;
}

.master-name {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.3px;
}

.master-address {
  margin: 6px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.55);
}

.addr-row {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.master-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

/* Buttons & badges */
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

.mini-ic {
  width: 16px;
  height: 16px;
  display: inline-flex;
  color: rgba(15, 23, 42, 0.70);
}
.mini-ic svg { width: 16px; height: 16px; }
.mini-ic.sub { color: rgba(15, 23, 42, 0.55); }
.mini-ic.brand { color: rgba(15, 23, 42, 0.70); margin-right: 8px; }
.mini-ic.pin { color: rgba(15, 23, 42, 0.55); }

/* Skeleton */
.skeleton-line {
  display: inline-block;
  height: 14px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  animation: pulse 1.2s ease-in-out infinite;
  vertical-align: middle;
}
.w-60 { width: 60%; }
.w-40 { width: 40%; }

@keyframes pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

@media (max-width: 375px) {
  .master-name { font-size: 16px; }
}
</style>
