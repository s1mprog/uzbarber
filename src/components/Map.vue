<script setup lang="ts">
import { computed, ref } from "vue"
import { LMap, LTileLayer, LMarker, LPopup } from "@vue-leaflet/vue-leaflet"
import "leaflet/dist/leaflet.css"

import L from "leaflet"
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
})

interface Master {
  id: number
  name: string
  lat: number
  lng: number
  address: string
  rating?: number
}

const props = defineProps<{
  masters: Master[]
  center?: [number, number]
}>()

const emit = defineEmits<{
  book: [master: Master]
}>()

const zoom = ref(13)

const mapCenter = computed<[number, number]>(() => {
  return props.center || [41.323766661763415, 69.2429604718647]
})

const url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const bookMaster = (master: Master) => {
  emit("book", master)
}
</script>

<template>
  <div class="map-container">
    <!-- ✅ zoomControl="false" убирает кнопки +/- -->
    <l-map
      v-model:zoom="zoom"
      :center="mapCenter"
      :options="{ zoomControl: false }"
      style="height: 100vh; width: 100vw"
    >

      <l-tile-layer :url="url" :attribution="attribution" />

      <l-marker v-for="master in masters" :key="master.id" :lat-lng="[master.lat, master.lng]">
        <l-popup>
          <div class="popup-card">
            <!-- Иконка -->
            <div class="popup-icon">✂️</div>
            
            <!-- Информация -->
            <div class="popup-info">
              <div class="popup-name">{{ master.name }}</div>
              <div class="popup-rating" v-if="master.rating">
                <span class="star">⭐</span>
                <span class="rating-value">{{ master.rating }}</span>
              </div>
              <div class="popup-address">{{ master.address }}</div>
            </div>

            <!-- Кнопка -->
            <button type="button" class="popup-btn" @click="bookMaster(master)">
              <span>Записаться</span>
              <span class="btn-arrow">→</span>
            </button>
          </div>
        </l-popup>
      </l-marker>
    </l-map>
  </div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}

/* Скрываем атрибуцию Leaflet для чистоты */
:deep(.leaflet-control-attribution) {
  display: none;
}

/* Переопределяем стили Leaflet popup */
:deep(.leaflet-popup-content-wrapper) {
  background: white;
  border-radius: 16px;
  padding: 0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

:deep(.leaflet-popup-content) {
  margin: 0;
  width: 260px !important;
}

:deep(.leaflet-popup-tip) {
  background: white;
}

/* Popup card */
.popup-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.popup-icon {
  font-size: 32px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.popup-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.popup-name {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
}

.popup-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.star {
  font-size: 16px;
}

.rating-value {
  font-weight: 600;
  color: #1a1a1a;
}

.popup-address {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

/* Кнопка записи */
.popup-btn {
  margin-top: 4px;
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.popup-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.popup-btn:active {
  transform: translateY(0);
}

.btn-arrow {
  font-size: 18px;
  transition: transform 0.2s ease;
}

.popup-btn:hover .btn-arrow {
  transform: translateX(4px);
}
</style>