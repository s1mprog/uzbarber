<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { getMyOrders } from "@/api/client"
import { getCurrentUserId } from "@/api/auth"
import { statusBadgeClass, statusLabel, type Order } from "@/types/order"

const router = useRouter()
const orders = ref<Order[]>([])
const loading = ref(true)
const error = ref("")

async function loadOrders() {
  try {
    loading.value = true
    error.value = ""
    
    // Получаем ID текущего пользователя
    const clientId = await getCurrentUserId()
    
    console.log('Loading orders for client:', clientId)
    
    // Загружаем заказы клиента
    orders.value = await getMyOrders(clientId)
    
    // Сортируем: сначала новые
    orders.value.sort((a, b) => {
      const dateA = `${a.bookingDate} ${a.startTime}`
      const dateB = `${b.bookingDate} ${b.startTime}`
      return dateB.localeCompare(dateA)
    })
    
  } catch (err: any) {
    console.error('Error loading orders:', err)
    error.value = 'Не удалось загрузить историю заказов'
  } finally {
    loading.value = false
  }
}

function viewOrder(orderId: number) {
  router.push({ name: 'ClientStatus', params: { bookingId: orderId } })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  })
}

function isUpcoming(order: Order): boolean {
  const now = new Date()
  const orderDate = new Date(`${order.bookingDate}T${order.startTime}`)
  return orderDate > now && !['canceled_by_client', 'canceled_by_master', 'done'].includes(order.status)
}

function isPast(order: Order): boolean {
  const now = new Date()
  const orderDate = new Date(`${order.bookingDate}T${order.startTime}`)
  return orderDate <= now || ['done', 'canceled_by_client', 'canceled_by_master'].includes(order.status)
}

onMounted(() => {
  loadOrders()
})
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Мои записи</h1>
      <button 
        @click="loadOrders"
        :disabled="loading"
        class="px-4 py-2 bg-gray-100 rounded-xl text-sm hover:bg-gray-200 disabled:opacity-50"
      >
        <span v-if="loading">⏳</span>
        <span v-else>🔄 Обновить</span>
      </button>
    </div>

    <!-- Загрузка -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Загрузка...</p>
    </div>

    <!-- Ошибка -->
    <div v-else-if="error" class="rounded-2xl bg-red-50 p-4 text-red-600 text-sm">
      {{ error }}
      <button 
        @click="loadOrders" 
        class="mt-2 text-sm underline"
      >
        Попробовать снова
      </button>
    </div>

    <!-- Пусто -->
    <div v-else-if="orders.length === 0" class="text-center py-12">
      <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-gray-500 text-lg font-medium mb-2">У вас пока нет записей</p>
      <p class="text-gray-400 text-sm mb-4">Выберите мастера на карте и запишитесь</p>
      <button 
        @click="router.push({ name: 'ClientMap' })"
        class="px-6 py-3 bg-black text-white rounded-xl font-medium"
      >
        Найти мастера
      </button>
    </div>

    <!-- Список заказов -->
    <div v-else class="space-y-3">
      <!-- Предстоящие -->
      <div v-for="order in orders.filter(isUpcoming)" :key="order.id">
        <div 
          class="rounded-2xl bg-white p-4 shadow-sm border-2 border-blue-100 cursor-pointer hover:shadow-md transition-shadow"
          @click="viewOrder(order.id)"
        >
          <div class="flex items-start justify-between mb-2">
            <div>
              <div class="font-semibold text-lg">{{ order.masterName || `Мастер #${order.masterId}` }}</div>
              <div class="text-sm text-gray-500">{{ formatDate(order.bookingDate) }}</div>
            </div>
            <span 
              class="text-xs px-3 py-1 rounded-full font-medium"
              :class="statusBadgeClass(order.status)"
            >
              {{ statusLabel(order.status) }}
            </span>
          </div>

          <div class="flex items-center text-sm text-gray-600 space-x-4">
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ order.startTime }}
            </div>
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ order.price.toLocaleString() }} сум
            </div>
          </div>

          <div v-if="order.comment" class="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
            {{ order.comment }}
          </div>
        </div>
      </div>

      <!-- Прошедшие -->
      <div v-if="orders.filter(isPast).length > 0" class="pt-4">
        <h2 class="text-lg font-semibold text-gray-500 mb-3">Прошедшие</h2>
        
        <div 
          v-for="order in orders.filter(isPast)" 
          :key="order.id"
          class="rounded-2xl bg-white p-4 shadow-sm mb-3 cursor-pointer hover:shadow-md transition-shadow opacity-75"
          @click="viewOrder(order.id)"
        >
          <div class="flex items-start justify-between mb-2">
            <div>
              <div class="font-semibold">{{ order.masterName || `Мастер #${order.masterId}` }}</div>
              <div class="text-sm text-gray-500">{{ formatDate(order.bookingDate) }}</div>
            </div>
            <span 
              class="text-xs px-3 py-1 rounded-full font-medium"
              :class="statusBadgeClass(order.status)"
            >
              {{ statusLabel(order.status) }}
            </span>
          </div>

          <div class="flex items-center text-sm text-gray-600 space-x-4">
            <div>{{ order.startTime }}</div>
            <div>{{ order.price.toLocaleString() }} сум</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>