<script setup lang="ts">
import { computed, ref } from "vue"
import MonthCalendar from "@/components/MonthCalendar.vue"
import { MOCK_ORDERS, statusBadgeClass, statusLabel, type MasterOrder } from "@/api/mock/masterOrders"
import { mockGetMonthLoad, type DayLoad } from "@/api/mock/availability"

const orders = ref<MasterOrder[]>([...MOCK_ORDERS])

const now = new Date()
const calYear = ref(now.getFullYear())
const calMonth = ref(now.getMonth() + 1)

const loads = ref<Record<string, DayLoad>>({})
const selectedDate = ref<string | null>(null)

async function loadMonth() {
  // masterId можно потом брать из auth/me
  loads.value = await mockGetMonthLoad({ masterId: 1, year: calYear.value, month: calMonth.value })
}
loadMonth()

function prevMonth() {
  if (calMonth.value === 1) {
    calMonth.value = 12
    calYear.value -= 1
  } else calMonth.value -= 1
  loadMonth()
}

function nextMonth() {
  if (calMonth.value === 12) {
    calMonth.value = 1
    calYear.value += 1
  } else calMonth.value += 1
  loadMonth()
}

const dayOrders = computed(() => {
  if (!selectedDate.value) return []
  return orders.value
    .filter((o) => o.date === selectedDate.value)
    .sort((a, b) => a.time.localeCompare(b.time))
})
</script>

<template>
  <div class="p-4 space-y-4">
    <h1 class="text-xl font-bold">Календарь</h1>

    <MonthCalendar
      :year="calYear"
      :month="calMonth"
      v-model="selectedDate"
      :loads="loads"
      @prev="prevMonth"
      @next="nextMonth"
    />

    <div class="rounded-2xl bg-white p-4 shadow">
      <div class="font-semibold mb-2">Заказы на день: {{ selectedDate || "—" }}</div>

      <div v-if="!selectedDate" class="text-sm text-gray-500">Выберите день в календаре</div>

      <div v-else-if="dayOrders.length === 0" class="text-sm text-gray-500">
        На этот день заказов нет.
      </div>

      <div v-else class="space-y-2">	
        <div v-for="o in dayOrders" :key="o.id" class="border rounded-xl p-3">
          <div class="flex items-center justify-between">
            <div class="font-semibold">{{ o.time }} — {{ o.clientName }}</div>
            <span class="text-xs px-2 py-1 rounded-full" :class="statusBadgeClass(o.status)">
              {{ statusLabel(o.status) }}
            </span>
          </div>
          <div class="text-sm text-gray-600">{{ o.clientPhone }}</div>
          <div v-if="o.comment" class="text-sm text-gray-700">Комментарий: {{ o.comment }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
