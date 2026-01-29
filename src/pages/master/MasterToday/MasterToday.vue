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

// ✅ ИСПРАВЛЕНО: Показываем все pending/not_accepted заказы + сегодняшние
const todayOrders = computed(() => {
  return orders.value
    .filter((o) => {
      // Показываем заказ если:
      // 1. Статус pending/not_accepted (независимо от даты) - ГЛАВНОЕ ИЗМЕНЕНИЕ
      // 2. ИЛИ дата = сегодня (любой статус)
      return o.status === 'not_accepted' || 
             o.status === 'pending' || 
             o.bookingDate === todayKey
    })
    .sort((a, b) => {
      // Сначала сортируем по дате (сегодняшние первыми)
      if (a.bookingDate !== b.bookingDate) {
        return a.bookingDate.localeCompare(b.bookingDate)
      }
      // Потом по времени
      return a.startTime.localeCompare(b.startTime)
    })
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
    
    // ✅ ИЗМЕНЕНО: Загружаем ВСЕ активные заказы, не только сегодняшние
    // Чтобы видеть pending заказы на будущее
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select(`
        id,
        booking_date,
        start_time,
        duration_minutes,
        price,
        comment,
        status,
        client_id,
        created_at,
        updated_at,
        users!orders_client_id_fkey(
          id,
          first_name,
          last_name,
          phone
        )
      `)
      .eq('master_id', mId)
      .in('status', ['not_accepted', 'pending', 'booked', 'completed'])
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })
    
    if (fetchError) throw fetchError
    
    // Преобразуем данные в нужный формат
    orders.value = (data || []).map((row: any) => ({
      id: row.id,
      clientId: row.client_id,
      masterId: mId,
      clientName: [row.users?.first_name, row.users?.last_name].filter(Boolean).join(' ') || 'Клиент',
      clientPhone: row.users?.phone || '',
      comment: row.comment || undefined,
      bookingDate: row.booking_date,
      startTime: row.start_time,
      durationMinutes: row.duration_minutes,
      status: row.status,
      price: row.price,
      createdAt: row.created_at || '', // Добавлено
      updatedAt: row.updated_at || ''  // Добавлено
    }))
    
    console.log('Loaded orders:', orders.value)
    console.log('Pending orders:', orders.value.filter(o => o.status === 'not_accepted' || o.status === 'pending'))
    
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

// ✅ Форматирование даты для отображения
function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  
  const isToday = dateStr === todayKey
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowKey = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`
  const isTomorrow = dateStr === tomorrowKey
  
  if (isToday) return 'Сегодня'
  if (isTomorrow) return 'Завтра'
  
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
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
      Заказов нет.
    </div>

    <!-- Orders -->
    <div v-else v-for="o in todayOrders" :key="o.id" class="rounded-2xl bg-white p-4 shadow space-y-2">
      <!-- ✅ Показываем дату если не сегодня -->
      <div v-if="o.bookingDate !== todayKey" class="text-xs font-semibold text-orange-600 mb-1">
        📅 {{ formatDate(o.bookingDate) }}
      </div>
      
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