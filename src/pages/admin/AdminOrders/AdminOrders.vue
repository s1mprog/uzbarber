<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { getAllOrders, updateOrderStatus as adminUpdateStatus } from "@/api/admin"
import { statusBadgeClass, statusLabel, type OrderStatus } from "@/types/order"

type AdminOrder = {
  id: number
  bookingDate: string
  startTime: string
  clientName: string
  clientPhone: string
  comment?: string
  status: OrderStatus
  masterName?: string
  masterAddress?: string
  price: number
}

const orders = ref<AdminOrder[]>([])
const loading = ref(true)
const searchQuery = ref("")
const statusFilter = ref<OrderStatus | "all">("all")
const dateFilter = ref<"all" | "today" | "upcoming" | "past">("all")

const allStatuses: Array<OrderStatus | "all"> = [
  "all",
  "not_accepted",
  "booked",
  "in_progress",
  "done",
  "canceled_by_client",
  "canceled_by_master"
]

// Фильтрация заказов
const filteredOrders = computed(() => {
  let result = [...orders.value]
  
  // Фильтр по статусу
  if (statusFilter.value !== "all") {
    result = result.filter((o) => o.status === statusFilter.value)
  }
  
  // Фильтр по дате
  if (dateFilter.value !== "all") {
    const today = new Date().toISOString().split('T')[0] as string
    
    if (dateFilter.value === "today") {
      result = result.filter(o => o.bookingDate === today)
    } else if (dateFilter.value === "upcoming") {
      result = result.filter(o => o.bookingDate >= today)
    } else if (dateFilter.value === "past") {
      result = result.filter(o => o.bookingDate < today)
    }
  }
  
  // Поиск по имени клиента, телефону, имени мастера
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(o => {
      const clientName = o.clientName.toLowerCase()
      const clientPhone = o.clientPhone.toLowerCase()
      const masterName = (o.masterName || '').toLowerCase()
      const orderId = String(o.id)
      
      return clientName.includes(query) ||
             clientPhone.includes(query) ||
             masterName.includes(query) ||
             orderId.includes(query)
    })
  }
  
  // Сортировка по дате
  result.sort((a, b) => 
    (b.bookingDate + b.startTime).localeCompare(a.bookingDate + a.startTime)
  )
  
  return result
})

// Статистика
const stats = computed(() => {
  return {
    total: orders.value.length,
    notAccepted: orders.value.filter(o => o.status === 'not_accepted').length,
    booked: orders.value.filter(o => o.status === 'booked').length,
    inProgress: orders.value.filter(o => o.status === 'in_progress').length,
    done: orders.value.filter(o => o.status === 'done').length,
    canceled: orders.value.filter(o => 
      o.status === 'canceled_by_client' || o.status === 'canceled_by_master'
    ).length
  }
})

async function loadOrders() {
  try {
    loading.value = true
    const data = await getAllOrders()
    orders.value = data as any
  } catch (error) {
    console.error('Error loading orders:', error)
  } finally {
    loading.value = false
  }
}

async function changeStatus(id: number, status: OrderStatus) {
  try {
    await adminUpdateStatus(id, status)
    
    // Обновляем локально
    const order = orders.value.find((o) => o.id === id)
    if (order) {
      order.status = status
    }
  } catch (error) {
    console.error('Error updating status:', error)
    alert('Не удалось обновить статус')
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  })
}

onMounted(() => {
  loadOrders()
})
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold">Заказы</h1>
      <button 
        @click="loadOrders"
        class="px-4 py-2 bg-gray-100 rounded-xl text-sm hover:bg-gray-200"
      >
        🔄 Обновить
      </button>
    </div>

    <!-- Поиск и фильтры -->
    <div class="rounded-2xl bg-white p-4 shadow space-y-3">
      <!-- Поиск -->
      <div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск по клиенту, мастеру, телефону, ID заказа..."
          class="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-black"
        />
      </div>

      <!-- Фильтры -->
      <div class="flex flex-wrap gap-2">
        <!-- Фильтр по статусу -->
        <select
          v-model="statusFilter"
          class="rounded-xl border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="all">Все статусы</option>
          <option v-for="s in allStatuses.filter(x => x !== 'all')" :key="s" :value="s">
            {{ statusLabel(s as OrderStatus) }}
          </option>
        </select>

        <!-- Фильтр по дате -->
        <select
          v-model="dateFilter"
          class="rounded-xl border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="all">Все даты</option>
          <option value="today">Сегодня</option>
          <option value="upcoming">Предстоящие</option>
          <option value="past">Прошедшие</option>
        </select>
      </div>

      <!-- Статистика -->
      <div class="grid grid-cols-3 gap-2 text-sm">
        <div class="p-2 bg-gray-50 rounded-lg">
          <div class="text-gray-500 text-xs">Всего</div>
          <div class="font-bold">{{ stats.total }}</div>
        </div>
        <div class="p-2 bg-orange-50 rounded-lg">
          <div class="text-gray-500 text-xs">Непринятые</div>
          <div class="font-bold text-orange-700">{{ stats.notAccepted }}</div>
        </div>
        <div class="p-2 bg-yellow-50 rounded-lg">
          <div class="text-gray-500 text-xs">Забронировано</div>
          <div class="font-bold text-yellow-700">{{ stats.booked }}</div>
        </div>
        <div class="p-2 bg-blue-50 rounded-lg">
          <div class="text-gray-500 text-xs">В процессе</div>
          <div class="font-bold text-blue-700">{{ stats.inProgress }}</div>
        </div>
        <div class="p-2 bg-green-50 rounded-lg">
          <div class="text-gray-500 text-xs">Выполнено</div>
          <div class="font-bold text-green-700">{{ stats.done }}</div>
        </div>
        <div class="p-2 bg-gray-100 rounded-lg">
          <div class="text-gray-500 text-xs">Отменено</div>
          <div class="font-bold text-gray-700">{{ stats.canceled }}</div>
        </div>
      </div>
    </div>

    <!-- Загрузка -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Загрузка заказов...</p>
    </div>

    <!-- Пусто -->
    <div v-else-if="filteredOrders.length === 0" class="text-center py-8">
      <p class="text-gray-500">Заказов не найдено</p>
    </div>

    <!-- Список заказов -->
    <div v-else class="space-y-3">
      <div 
        v-for="o in filteredOrders" 
        :key="o.id" 
        class="rounded-2xl bg-white p-4 shadow hover:shadow-md transition-shadow"
      >
        <!-- Заголовок -->
        <div class="flex items-start justify-between mb-3">
          <div>
            <div class="font-semibold text-lg">{{ o.clientName }}</div>
            <div class="text-sm text-gray-500">{{ formatDate(o.bookingDate) }} • {{ o.startTime }}</div>
            <div class="text-xs text-gray-400">ID: {{ o.id }}</div>
          </div>
          <span 
            class="text-xs px-3 py-1 rounded-full font-medium"
            :class="statusBadgeClass(o.status)"
          >
            {{ statusLabel(o.status) }}
          </span>
        </div>

        <!-- Детали -->
        <div class="space-y-2 text-sm">
          <div class="flex items-center gap-2">
            <span class="text-gray-500">📱</span>
            <span>{{ o.clientPhone }}</span>
          </div>
          
          <div v-if="o.masterName" class="flex items-center gap-2">
            <span class="text-gray-500">💈</span>
            <span>{{ o.masterName }}</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-gray-500">💰</span>
            <span>{{ o.price?.toLocaleString() || '—' }} сум</span>
          </div>
          
          <div v-if="o.comment" class="bg-gray-50 p-2 rounded-lg">
            <span class="text-gray-500">💬</span> {{ o.comment }}
          </div>
        </div>

        <!-- Изменить статус -->
        <div class="pt-3 mt-3 border-t">
          <label class="text-xs text-gray-500 block mb-1">Изменить статус</label>
          <select
            class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            :value="o.status"
            @change="changeStatus(o.id, ($event.target as HTMLSelectElement).value as OrderStatus)"
          >
            <option value="not_accepted">Непринятый</option>
            <option value="booked">Забронированный</option>
            <option value="in_progress">В процессе</option>
            <option value="done">Сделанный</option>
            <option value="canceled_by_client">Отменён пользователем</option>
            <option value="canceled_by_master">Отменён мастером</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>