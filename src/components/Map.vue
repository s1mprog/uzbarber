<script setup lang="ts">
import { ref } from 'vue'
import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'

// Импорт иконок Leaflet (важно для маркеров)
import L from 'leaflet'
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
	iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
	iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
	shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface Master {
	id: number
	name: string
	lat: number
	lng: number
	address: string
}

const props = defineProps<{
	masters: Master[]
	center?: [number, number]
}>()

const emit = defineEmits<{
	book: [master: Master]
}>()

const zoom = ref(13)
const center = ref(props.center || [41.323766661763415, 69.2429604718647])
const url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const bookMaster = (master: Master) => {
	emit('book', master)
}
</script>

<template>
  <div class="map-container" style="height: 400px;">
    <l-map v-model:zoom="zoom" :center="center" style="height: 100%;">
      <l-tile-layer :url="url" :attribution="attribution"></l-tile-layer>
      <l-marker
        v-for="master in masters"
        :key="master.id"
        :lat-lng="[master.lat, master.lng]"
      >
        <l-popup>
          <strong>{{ master.name }}</strong><br>
          {{ master.address }}<br>
          <button @click="bookMaster(master)">Записаться</button>
        </l-popup>
      </l-marker>
    </l-map>
  </div>
</template>


<style scoped>
.map-container {
  border: 1px solid #ddd;
  border-radius: 8px;
}
</style>