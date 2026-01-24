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

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1) // 1..12

const pad = (n: number) => String(n).padStart(2, "0")
const todayKey = `${currentYear.value}-${pad(currentMonth.value)}-${pad(today.getDate())}`

// Инициализируем selectedDate = сегодня
if (!selectedDate.value) {
  selectedDate.value = todayKey
}

const dayOrders = computed(() => {
  if (!selectedDate.value) return []
  return orders.value
    .filter(o => o.bookingDate === selectedDate.value)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
})

async function loadData() {
  try {
    loading.value = true
    error.value = ""
    
    // Получаем master_id
    const tgUser = getTelegramUser()
    if (!tgUser?.id) {
      error.value = "Telegram user not found"
      return
    }
    
    const mId = await getMasterIdByTelegramId(tgUser.id)
    if (!mId) {
      error.value = "Master profile not found"
      return
    }
    
    masterId.value = mId
    
    // Загружаем заказы за весь месяц
    orders.value = await getMasterOrders({ masterId: mId })
    
    // Загружаем загрузку месяца
    monthLoad.value = await getMonthLoad({
      masterId: mId,
      year: currentYear.value,
      month: currentMonth.value
    })
    
    console.log('Loaded orders:', orders.value.length)
    console.log('Month load:', monthLoad.value)
    
  } catch (err: any) {
    console.error('Error loading data:', err)
    error.value = 'Не удалось загрузить данные'
  } finally {
    loading.value = false
  }
}

// Обработчик выбора дня - используем правильное название события
function onDateSelect(dateKey: string) {
  console.log('Date selected:', dateKey)
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

// Перезагружаем данные при смене месяца
watch([currentYear, currentMonth], () => {
  loadData()
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="p-4 space-y-4">
    <h1 class="text-xl font-bold">Календарь заказов</h1>

    <!-- Error -->
    <div v-if="error" class="rounded-2xl bg-red-50 p-4 text-red-600 text-sm">
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Загрузка календаря...</p>
    </div>

    <template v-else>
      <!-- Calendar - используем правильные пропсы и события -->
      <MonthCalendar
        v-model="selectedDate"
        :year="currentYear"
        :month="currentMonth"
        :loads="monthLoad"
        @select="onDateSelect"
        @prev="prevMonth"
        @next="nextMonth"
      />

      <!-- Orders for selected day -->
      <div class="rounded-2xl bg-white p-4 shadow">
        <h2 class="font-semibold mb-3">
          {{ selectedDate ? new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'Выберите день' }}
        </h2>

        <div v-if="dayOrders.length === 0" class="text-gray-500 text-sm">
          На этот день заказов нет
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="o in dayOrders"
            :key="o.id"
            class="border border-gray-200 rounded-xl p-3 space-y-1"
          >
            <div class="flex items-center justify-between">
              <div class="font-semibold">{{ o.startTime }} — {{ o.clientName }}</div>
              <span class="text-xs px-2 py-1 rounded-full" :class="statusBadgeClass(o.status)">
                {{ statusLabel(o.status) }}
              </span>
            </div>
            <div class="text-sm text-gray-600">{{ o.clientPhone }}</div>
            <div v-if="o.comment" class="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg">
              💬 {{ o.comment }}
            </div>
            <div class="text-xs text-gray-500">
              {{ o.durationMinutes }} мин • {{ o.price.toLocaleString() }} сум
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>