<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { useBookingStore } from "@/stores/booking"
import { getMasterById } from "@/api/client"
import BackButton from "@/components/BackButton.vue"


const router = useRouter()
const booking = useBookingStore()
const master = ref<any>(null)
	
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


function payMock(provider: "click" | "payme") {
	const bookingId = String(Date.now())
  router.push({ name: "ClientStatus", params: { bookingId }, query: { provider } })
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

      <div class="flex justify-between text-lg">
        <span class="text-gray-500">Сумма</span>
        <b>{{ booking.price }}</b>
      </div>

      <div class="text-xs text-gray-500 mt-2">
        Отмена бесплатно за 12 часов. Позже — штрафы по правилам сервиса.
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button class="rounded-xl bg-black text-white p-3" @click="payMock('click')">Pay Click</button>
      <button class="rounded-xl bg-black text-white p-3" @click="payMock('payme')">Pay Payme</button>
    </div>
  </div>
</template>
