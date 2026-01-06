<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Map from '@/components/Map.vue' 
import type { Master } from '@/types/master'
// Данные мастеров (замени на реальные из API/Pinia)
const masters = ref<Master[]>([
  {
    id: 1,
    name: 'Мастер Иван',
    lat: 41.34125936014218,
    lng: 69.24285354126796,
    address: 'Nurafshon kochasi 14, Тоshkent, Toshkent, Узбекистан'
  }
])

// Центр карты (например, локация пользователя)
const userLocation = ref<[number, number]>([41.323766661763415, 69.2429604718647])

const router = useRouter()

// Обработка события "Записаться"
const handleBook = (master: Master) => {
  // Переход на страницу booking с данными мастера
  router.push({ name: 'ClientBooking', params: { masterId: master.id } })
}

// Опционально: загрузка данных при монтировании
onMounted(async () => {
  // masters.value = await fetchMastersFromAPI()
  // userLocation.value = await getUserLocation()
})
</script>

<template>
  <div class="client-map">
    <h2>Выберите мастера на карте</h2>
    <Map
      :masters="masters"
      :center="userLocation"
      @book="handleBook"
    />
  </div>
</template>

<style scoped>
.client-map {
  padding: 1rem;
}
</style>