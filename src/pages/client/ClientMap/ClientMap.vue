<script setup lang="ts">
import Map from "@/components/Map.vue"
import type { Master } from "@/types/master"
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()

// Тест-данные мастеров (позже заменишь на API)
const masters = ref<Master[]>([
  {
    id: 1,
    name: "Мастер Иван",
    lat: 41.34125936014218,
    lng: 69.24285354126796,
    address: "Nurafshon kochasi 14, Тоshkent, Toshkent, Узбекистан",
    rating: 4.8
  },
  {
    id: 2,
    name: "Barber Ali",
    lat: 41.3289,
    lng: 69.2482,
    address: "Tashkent City, Узбекистан",
    rating: 4.6
  }
])

// Центр карты (позже подставишь геолокацию)
const userLocation = ref<[number, number]>([41.323766661763415, 69.2429604718647])

// Клик “Записаться” -> профиль мастера + календарь
const handleBook = (master: Master) => {
  router.push({ name: "ClientMaster", params: { id: master.id } })
}

onMounted(async () => {
  // позже:
  // masters.value = await api.getMastersNearby(...)
  // userLocation.value = await getUserLocation()
})
</script>

<template>
  <div class="client-map p-4">
    <h2 class="text-lg font-semibold mb-3">Выберите барбера на карте</h2>

    <Map :masters="masters" :center="userLocation" @book="handleBook" />
  </div>
</template>

<style scoped>
.client-map {
  width: 100%;
}
</style>
