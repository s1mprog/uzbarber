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

// Клик "Записаться" -> профиль мастера + календарь
const handleBook = (master: Master) => {
  router.push({ name: "ClientMaster", params: { id: master.id } })
}

onMounted(async () => {
  // позже:
  // masters.value = await api.getMastersNearby(...)
  // userLocation.value = await getUserLocation()
  console.log('Loaded masters:', masters.value)
})
</script>

<template>
  <div class="client-map-page">
    <!-- Заголовок поверх карты -->
    <div class="map-header">
      <div class="header-content">
        <h1 class="header-title">Найдите своего барбера</h1>
        <p class="header-subtitle">{{ masters.length }} мастеров рядом</p>
      </div>
    </div>

    <!-- Карта на весь экран -->
    <Map :masters="masters" :center="userLocation" @book="handleBook" />
  </div>
</template>

<style scoped>
.client-map-page {
  position: relative;
  width: 100%;
  height: 100%;
  /* Убрали градиентный фон - он мешал видеть карту */
}

/* Заголовок поверх карты */
.map-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: linear-gradient(
    180deg,
    rgba(102, 126, 234, 0.95) 0%,
    rgba(102, 126, 234, 0.85) 60%,
    rgba(102, 126, 234, 0) 100%
  );
  padding: 16px 20px 32px 20px;
  pointer-events: none;
}

.header-content {
  max-width: 100%;
}

.header-title {
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 4px 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  letter-spacing: -0.5px;
}

.header-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
  font-weight: 500;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

/* Responsive */
@media (max-width: 375px) {
  .header-title {
    font-size: 22px;
  }
  
  .header-subtitle {
    font-size: 13px;
  }
}
</style>