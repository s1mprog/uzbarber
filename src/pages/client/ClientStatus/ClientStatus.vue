<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { getOrderById } from "@/api/client"
import { statusBadgeClass, statusLabel } from "@/types/order"
import BackButton from "@/components/BackButton.vue"

const route = useRoute()
const router = useRouter()

const order = ref<any>(null)
const loading = ref(true)
const error = ref("")

// Интервал для автообновления статуса
let pollInterval: any = null

async function loadOrder() {
  try {
    const bookingId = Number(route.params.bookingId)
    if (!bookingId) {
      error.value = "Invalid booking ID"
      return
    }
    
    order.value = await getOrderById(bookingId)
    console.log('Order loaded:', order.value)
    
  } catch (err: any) {
    console.error('Error loading order:', err)
    error.value = 'Не удалось загрузить заказ'
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'long',
    year: 'numeric',
    weekday: 'short'
  })
}

function getStatusMessage(status: string): { emoji: string; text: string; color: string } {
  switch (status) {
    case 'not_accepted':
      return {
        emoji: '⏳',
        text: 'Ждём подтверждения мастера...',
        color: 'text-orange-600'
      }
    case 'booked':
      return {
        emoji: '✅',
        text: 'Мастер подтвердил запись!',
        color: 'text-green-600'
      }
    case 'in_progress':
      return {
        emoji: '✂️',
        text: 'Мастер выполняет заказ',
        color: 'text-blue-600'
      }
    case 'done':
      return {
        emoji: '🎉',
        text: 'Заказ выполнен!',
        color: 'text-green-600'
      }
    case 'canceled_by_master':
      return {
        emoji: '❌',
        text: 'Мастер отклонил запись',
        color: 'text-red-600'
      }
    case 'canceled_by_client':
      return {
        emoji: '🚫',
        text: 'Вы отменили запись',
        color: 'text-gray-600'
      }
    default:
      return {
        emoji: '❓',
        text: 'Неизвестный статус',
        color: 'text-gray-600'
      }
  }
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace({ name: "ClientHistory" })
  }
}

function goToHistory() {
  router.push({ name: "ClientHistory" })
}

onMounted(() => {
  loadOrder()
  
  // Автообновление каждые 5 секунд если статус not_accepted
  pollInterval = setInterval(() => {
    if (order.value?.status === 'not_accepted') {
      loadOrder()
    }
  }, 5000)
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})
</script>

<template>
  <div class="p-4 space-y-4">
    <BackButton @click="goBack" />
    
    <div>
      <h1 class="text-xl font-bold">Статус заявки</h1>
      <p class="text-sm text-gray-500">Booking ID: {{ route.params.bookingId }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Загрузка...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-2xl bg-red-50 p-4 text-red-600 text-sm">
      {{ error }}
      <button @click="loadOrder" class="ml-2 underline">Попробовать снова</button>
    </div>

    <!-- Order Details -->
    <template v-else-if="order">
      <!-- Status Card -->
      <div class="rounded-2xl bg-white p-6 shadow text-center">
        <div class="text-4xl mb-2">{{ getStatusMessage(order.status).emoji }}</div>
        <div class="text-lg font-semibold" :class="getStatusMessage(order.status).color">
          {{ getStatusMessage(order.status).text }}
        </div>
        <div class="mt-2">
          <span 
            class="text-xs px-3 py-1 rounded-full font-medium inline-block"
            :class="statusBadgeClass(order.status)"
          >
            {{ statusLabel(order.status) }}
          </span>
        </div>
      </div>

      <!-- Master Info -->
      <div class="rounded-2xl bg-white p-4 shadow space-y-3">
        <h2 class="font-semibold">Информация о записи</h2>
        
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Мастер:</span>
            <span class="font-medium">{{ order.masterName || 'Не указан' }}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-500">Адрес:</span>
            <span class="text-right">{{ order.masterAddress || 'Не указан' }}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-500">Дата:</span>
            <span>{{ formatDate(order.booking_date) }}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-500">Время:</span>
            <span class="font-medium">{{ order.start_time }}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-500">Длительность:</span>
            <span>{{ order.duration_minutes }} мин</span>
          </div>
          
          <div v-if="order.comment" class="pt-2 border-t">
            <div class="text-gray-500 mb-1">Комментарий:</div>
            <div class="bg-gray-50 p-2 rounded-lg">{{ order.comment }}</div>
          </div>
          
          <div class="pt-2 border-t">
            <div class="flex justify-between text-lg">
              <span class="text-gray-500">Стоимость:</span>
              <span class="font-bold">{{ order.price.toLocaleString() }} сум</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="space-y-2">
        <button
          @click="loadOrder"
          class="w-full rounded-xl bg-gray-100 text-gray-700 p-3 hover:bg-gray-200 font-medium"
        >
          🔄 Обновить статус
        </button>
        
        <button
          @click="goToHistory"
          class="w-full rounded-xl bg-black text-white p-3 hover:opacity-90 font-medium"
        >
          Посмотреть все записи
        </button>
      </div>

      <!-- Auto-refresh indicator -->
      <div v-if="order.status === 'not_accepted'" class="text-center text-xs text-gray-500">
        Статус обновляется автоматически каждые 5 секунд
      </div>
    </template>
  </div>
</template>