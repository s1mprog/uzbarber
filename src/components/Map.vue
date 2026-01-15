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

// ✅ чтобы центр обновлялся, если props.center поменяется
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
    <l-map v-model:zoom="zoom" :center="mapCenter" style="height: 100%; width: 100%">
      <l-tile-layer :url="url" :attribution="attribution" />

      <l-marker v-for="master in masters" :key="master.id" :lat-lng="[master.lat, master.lng]">
        <l-popup>
          <div class="popup">
            <div class="font-bold">{{ master.name }}</div>
            <div class="text-sm">{{ master.address }}</div>
            <div v-if="master.rating" class="text-sm">⭐ {{ master.rating }}</div>

            <button type="button" class="btn" @click="bookMaster(master)">Записаться</button>
          </div>
        </l-popup>
      </l-marker>
    </l-map>
  </div>
</template>

<style scoped>
.map-container {
  height: 400px;
  border: 1px solid #ddd;
  border-radius: 12px;
  overflow: hidden;
}

.popup {
  display: grid;
  gap: 6px;
  min-width: 220px;
}

.btn {
  margin-top: 6px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 10px;
  background: #111;
  color: #fff;
  border: none;
  cursor: pointer;
}
.btn:hover {
  opacity: 0.92;
}
</style>
