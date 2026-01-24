<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { useBookingStore } from "@/stores/booking"
import { getMasterById, createOrder } from "@/api/client"
import { getCurrentUserId } from "@/api/auth"
import { notifyMasterNewOrder } from "@/api/telegram"
import { supabase } from "@/lib/supabase"
import BackButton from "@/components/BackButton.vue"

const router = useRouter()
const booking = useBookingStore()
const master = ref<any>(null)
const loading = ref(false)
const error = ref("")

const canPay = computed(() => {
  return !!(booking.masterId && booking.date && booking.time && booking.clientName && booking.clientPhone)
})

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function addMinutes(time: string, minutesToAdd: number) {
  const parts = time.split(":")
  const hh = Number(parts[0] ?? 0)
  const mm = Number(parts[1] ?? 0)

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return time

  const total = (hh * 60 + mm + minutesToAdd) % (24 * 60)
  const h2 = Math.floor(total / 60)
  const m2 = total % 60
  return `${pad(h2)}:${pad(m2)}`
}

const endTime = computed(() => {
  if (!booking.time) return ""
  return addMinutes(booking.time, booking.durationMin || 60)
})

onMounted(async () => {
  if (!canPay.value) {
    router.replace({ name: "ClientContact" })
    return
  }
  master.value = await getMasterById(booking.masterId!)
})

async function createBooking() {
  if (!canPay.value) return
  
  try {
    loading.value = true
    error.value = ""
    
    // Получаем или создаём пользователя в базе
    const clientId = await getCurrentUserId()
    
    console.log('Creating order for client:', clientId)
    
    // Создаём заказ в Supabase
    const order = await createOrder({
      clientId,
      masterId: booking.masterId!,
      bookingDate: booking.date!,
      startTime: booking.time!,
      durationMinutes: booking.durationMin,
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      comment: booking.comment || undefined,
      price: booking.price
    })
    
    console.log('Order created:', order)
    
    // ✅ Отправляем уведомление мастеру
    try {
      // Получаем telegram_chat_id мастера
      const { data: masterData } = await supabase
        .from('masters')
        .select(`
          id,
          name,
          users!masters_user_id_fkey(telegram_chat_id)
        `)
        .eq('id', booking.masterId!)
        .single()
      
      const masterChatId = (masterData?.users as any)?.[0]?.telegram_chat_id || (masterData?.users as any)?.telegram_chat_id
      
      if (masterChatId) {
        await notifyMasterNewOrder({
          masterChatId,
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
          bookingDate: booking.date!,
          startTime: booking.time!,
          comment: booking.comment,
          price: booking.price
        })
        console.log('✅ Notification sent to master')
      } else {
        console.warn('⚠️ Master chat_id not found - notification not sent')
      }
    } catch (notifyError) {
      // Не критично если уведомление не отправилось
      console.error('Failed to send notification:', notifyError)
    }
    
    // Сбрасываем состояние бронирования
    booking.reset()
    
    // Переходим на страницу статуса заказа
    router.push({ 
      name: "ClientStatus", 
      params: { bookingId: order.id }
    })
    
  } catch (err: any) {
    console.error('Error creating order:', err)
    error.value = err.message || 'Не удалось создать заказ'
  } finally {
    loading.value = false
  }
}

function goBack() {
  const id = booking.masterId
  const date = booking.date

  if (window.history.length > 1) {
    router.back()
    return
  }

  if (id && date) {
    router.replace({ name: "ClientTime", params: { id }, query: { date } })
  } else if (id) {
    router.replace({ name: "ClientMaster", params: { id } })
  } else {
    router.replace({ name: "ClientMap" })
  }
}
</script>

<template>
  <div class="p-4 space-y-4">
    <BackButton @click="goBack" />
    <h1 class="text-xl font-bold">Подтверждение</h1>

    <div class="rounded-2xl bg-white p-4 shadow space-y-2">
      <div class="flex justify-between">
        <span class="text-gray-500">Барбер</span>
        <b>{{ master?.name || booking.masterId }}</b>
      </div>

      <div class="flex justify-between">
        <span class="text-gray-500">Дата</span>
        <b>{{ booking.date }}</b>
      </div>

      <div class="flex justify-between">
        <span class="text-gray-500">Время</span>
        <b>{{ booking.time }} – {{ endTime }}</b>
      </div>

      <div class="flex justify-between">
        <span class="text-gray-500">Адрес</span>
        <b class="text-right">{{ master?.address || "—" }}</b>
      </div>

      <hr class="my-2" />

      <div class="flex justify-between">
        <span class="text-gray-500">Имя</span>
        <b>{{ booking.clientName }}</b>
      </div>

      <div class="flex justify-between">
        <span class="text-gray-500">Телефон</span>
        <b>{{ booking.clientPhone }}</b>
      </div>

      <div v-if="booking.comment" class="flex justify-between">
        <span class="text-gray-500">Комментарий</span>
        <b class="text-right">{{ booking.comment }}</b>
      </div>

      <hr class="my-2" />

      <div class="flex justify-between text-lg">
        <span class="text-gray-500">Сумма</span>
        <b>{{ booking.price.toLocaleString() }} сум</b>
      </div>

      <div class="text-xs text-gray-500 mt-2">
        После подтверждения заказ будет отправлен мастеру. Вы получите уведомление когда мастер примет заказ.
      </div>

      <div class="text-xs text-gray-500">
        Отмена бесплатно за 2 часа до записи.
      </div>
    </div>

    <!-- Ошибка -->
    <div v-if="error" class="rounded-2xl bg-red-50 p-4 text-red-600 text-sm">
      {{ error }}
    </div>

    <!-- Кнопка подтверждения -->
    <button 
      class="w-full rounded-xl bg-black text-white p-4 font-semibold disabled:opacity-50"
      :disabled="loading || !canPay"
      @click="createBooking"
    >
      <span v-if="loading">Создание заказа...</span>
      <span v-else>Подтвердить бронирование</span>
    </button>
  </div>
</template>