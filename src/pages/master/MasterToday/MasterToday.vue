<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { getTodayOrders, acceptOrder as apiAcceptOrder, rejectOrder as apiRejectOrder, getMasterIdByTelegramId } from "@/api/master"
import { getTelegramUser } from "@/shared/auth/role"
import { notifyClientOrderAccepted, notifyClientOrderRejected } from "@/api/telegram"
import { supabase } from "@/lib/supabase"
import { statusBadgeClass, statusLabel, type Order } from "@/types/order"

const orders = ref<Order[]>([])
const loading = ref(true)
const error = ref("")
const masterId = ref<number | null>(null)

const today = new Date()
const pad = (n: number) => String(n).padStart(2, "0")
const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

const todayOrders = computed(() => {
  return orders.value
    .filter((o) => o.bookingDate === todayKey)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
})

async function loadOrders() {
  try {
    loading.value = true
    error.value = ""
    
    // Получаем master_id по telegram_id
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
    
    // Загружаем заказы за сегодня
    orders.value = await getTodayOrders(mId)
    
    console.log('Loaded today orders:', orders.value)
    
  } catch (err: any) {
    console.error('Error loading orders:', err)
    error.value = 'Не удалось загрузить заказы'
  } finally {
    loading.value = false
  }
}

async function acceptOrder(orderId: number) {
  try {
    await apiAcceptOrder(orderId)
    
    // Обновляем локально
    const order = orders.value.find(o => o.id === orderId)
    if (order) {
      order.status = 'booked'
    }
    
    // ✅ Отправляем уведомление клиенту
    try {
      // Получаем данные заказа и клиента
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          booking_date,
          start_time,
          users!orders_client_id_fkey(telegram_chat_id),
          masters(name, address)
        `)
        .eq('id', orderId)
        .single()
      
      if (!orderData) {
        console.warn('⚠️ Order data not found')
        return
      }
      
      const clientChatId = (orderData?.users as any)?.[0]?.telegram_chat_id || (orderData?.users as any)?.telegram_chat_id
      const masterData = (orderData?.masters as any)?.[0] || (orderData?.masters as any)
      
      if (clientChatId && masterData) {
        await notifyClientOrderAccepted({
          clientChatId,
          masterName: masterData.name,
          masterAddress: masterData.address,
          bookingDate: orderData.booking_date,
          startTime: orderData.start_time
        })
        console.log('✅ Client notified: order accepted')
      } else {
        console.warn('⚠️ Client chat_id not found')
      }
    } catch (notifyError) {
      console.error('Failed to notify client:', notifyError)
    }
    
  } catch (err) {
    console.error('Error accepting order:', err)
    alert('Не удалось принять заказ')
  }
}

async function rejectOrder(orderId: number) {
  try {
    await apiRejectOrder(orderId)
    
    // Обновляем локально
    const order = orders.value.find(o => o.id === orderId)
    if (order) {
      order.status = 'canceled_by_master'
    }
    
    // ✅ Отправляем уведомление клиенту
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          booking_date,
          start_time,
          users!orders_client_id_fkey(telegram_chat_id),
          masters(name)
        `)
        .eq('id', orderId)
        .single()
      
      if (!orderData) {
        console.warn('⚠️ Order data not found')
        return
      }
      
      const clientChatId = (orderData?.users as any)?.[0]?.telegram_chat_id || (orderData?.users as any)?.telegram_chat_id
      const masterData = (orderData?.masters as any)?.[0] || (orderData?.masters as any)
      
      if (clientChatId && masterData) {
        await notifyClientOrderRejected({
          clientChatId,
          masterName: masterData.name,
          bookingDate: orderData.booking_date,
          startTime: orderData.start_time
        })
        console.log('✅ Client notified: order rejected')
      } else {
        console.warn('⚠️ Client chat_id not found')
      }
    } catch (notifyError) {
      console.error('Failed to notify client:', notifyError)
    }
    
  } catch (err) {
    console.error('Error rejecting order:', err)
    alert('Не удалось отклонить заказ')
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<template>
  <div class="p-4 space-y-3">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold">Сегодня</h1>
        <p class="text-sm text-gray-500">{{ todayKey }}</p>
      </div>
      <button 
        @click="loadOrders"
        class="px-4 py-2 bg-gray-100 rounded-xl text-sm hover:bg-gray-200"
      >
        🔄
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="rounded-2xl bg-red-50 p-4 text-red-600 text-sm">
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Загрузка заказов...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="todayOrders.length === 0" class="rounded-2xl bg-white p-4 shadow">
      Сегодня заказов нет.
    </div>

    <!-- Orders -->
    <div v-else v-for="o in todayOrders" :key="o.id" class="rounded-2xl bg-white p-4 shadow space-y-2">
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

      <div class="text-sm text-gray-500">
        Длительность: {{ o.durationMinutes }} мин • {{ o.price.toLocaleString() }} сум
      </div>

      <div v-if="o.status === 'not_accepted'" class="grid grid-cols-2 gap-2 pt-2">
        <button 
          class="rounded-xl bg-black text-white p-3 hover:opacity-90" 
          @click="acceptOrder(o.id)"
        >
          Принять
        </button>
        <button 
          class="rounded-xl bg-gray-200 text-gray-800 p-3 hover:bg-gray-300" 
          @click="rejectOrder(o.id)"
        >
          Отклонить
        </button>
      </div>
    </div>
  </div>
</template>