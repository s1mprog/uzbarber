<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useBookingStore } from "@/stores/booking"
import { getBookedHours, getTimeSlots24h } from "@/api/client"
import BackButton from "@/components/BackButton.vue"


const route = useRoute()
const router = useRouter()
const booking = useBookingStore()

const masterId = computed(() => Number(route.params.id))
const date = computed(() => (route.query.date as string) || booking.date)

const slots = ref<{ start: string; end: string }[]>([])
const bookedSet = ref<Set<string>>(new Set())
  
  const isBooked = (start: string) => bookedSet.value.has(start)

onMounted(async () => {
  if (!date.value) {
    router.replace({ name: "ClientMaster", params: { id: masterId.value } })
    return
  }
  
  slots.value = await getTimeSlots24h()
  
  const booked = await getBookedHours({ masterId: masterId.value, date: date.value })
  bookedSet.value = new Set(booked)
})

function pickSlot(s: { start: string; end: string }) {
  if (isBooked(s.start)) return
  booking.setTime(s.start)
  router.push({ name: "ClientContact" })
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace({ name: "ClientMaster", params: { id: masterId.value } })
}
</script>

<template>
  <div class="p-4">
    <BackButton @click="goBack" />
    <h1 class="text-xl font-bold">Выбор времени</h1>
    <p class="text-sm text-gray-500">Дата: {{ date }}</p>
    
    <div class="mt-4 grid grid-cols-2 gap-2">
      <button
        v-for="s in slots"
        :key="s.start"
        class="rounded-xl p-3 shadow transition"
        :class="isBooked(s.start) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white hover:opacity-95'"
        :disabled="isBooked(s.start)"
        @click="pickSlot(s)"
      >
        {{ s.start }} – {{ s.end }}
        <span v-if="isBooked(s.start)" class="block text-xs mt-1">Занято</span>
      </button>
    </div>
  </div>
</template>
	