<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useBookingStore } from "@/stores/booking"
import MonthCalendar from "@/components/MonthCalendar.vue"
import { getMasterById, getMonthLoad } from "@/api/client"
import type { DayLoad } from "@/types/availability"
import BackButton from "@/components/BackButton.vue"

const route = useRoute()
const router = useRouter()
const booking = useBookingStore()

const masterId = computed(() => Number(route.params.id))

const master = ref<any>(null)

const now = new Date()
const calYear = ref(now.getFullYear())
const calMonth = ref(now.getMonth() + 1) // 1..12

const loads = ref<Record<string, DayLoad>>({})
const selectedDate = ref<string | null>(null)

async function loadMonth() {
  loads.value = await getMonthLoad({
    masterId: masterId.value,
    year: calYear.value,
    month: calMonth.value
  })
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

// ✅ 1) При смене masterId — один раз сетим мастера и грузим данные
watch(
  masterId,
  async (id) => {
    if (!Number.isFinite(id)) return
    booking.setMaster(id)
    master.value = await getMasterById(id)
    await loadMonth()
  },
  { immediate: true }
)

// ✅ 2) При смене месяца — обновляем loads
watch([calYear, calMonth], async () => {
  await loadMonth()
})

// ✅ 3) При выборе даты — один раз пушим на страницу времени
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
  { flush: "post" } // важно: после обновления DOM
)

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace({ name: "ClientMap" })
}

onMounted(async () => {
  // если надо — можно тут дополнительно что-то
})
</script>

<template>
  <div class="p-4 space-y-4">
    <BackButton @click="goBack" />

    <div class="rounded-2xl bg-white p-4 shadow">
      <h1 class="text-xl font-bold">{{ master?.name || `Master #${masterId}` }}</h1>
      <p class="text-sm text-gray-500">{{ master?.address || "—" }}</p>
      <p v-if="master?.rating" class="text-sm mt-1">⭐ {{ master.rating }}</p>
    </div>

    <div>
      <h2 class="text-base font-semibold mb-2">Выберите день</h2>

      <MonthCalendar
        :year="calYear"
        :month="calMonth"
        v-model="selectedDate"
        :loads="loads"
        @prev="prevMonth"
        @next="nextMonth"
      />
    </div>
  </div>
</template>