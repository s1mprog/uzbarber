<script setup lang="ts">
import { computed, ref, watch } from "vue"
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
const mapRef = ref<any>(null)
const selectedId = ref<number | null>(null)

const defaultCenter: [number, number] = [41.323766661763415, 69.2429604718647]

const mapCenter = computed<[number, number]>(() => {
  return props.center || defaultCenter
})

const url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const markerIcon = L.divIcon({
  className: "km-marker",
  html: `
    <div class="mk">
      <div class="mk-inner">✂️</div>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 42],
  popupAnchor: [0, -40]
})

function bookMaster(master: Master) {
  emit("book", master)
}

function focusOn(master: Master) {
  selectedId.value = master.id
  const leaflet = mapRef.value?.leafletObject
  if (leaflet) leaflet.setView([master.lat, master.lng], Math.max(zoom.value, 15), { animate: true })
}

function resetView() {
  selectedId.value = null
  const leaflet = mapRef.value?.leafletObject
  if (leaflet) leaflet.setView(mapCenter.value, 13, { animate: true })
}

function locateMe() {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const leaflet = mapRef.value?.leafletObject
      if (!leaflet) return
      leaflet.setView([pos.coords.latitude, pos.coords.longitude], 15, { animate: true })
    },
    () => {
      // silently ignore (можно показать toast)
    },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

// если центр пришёл сверху — аккуратно подвинем карту
watch(
  () => props.center,
  (c) => {
    if (!c) return
    const leaflet = mapRef.value?.leafletObject
    if (!leaflet) return
    leaflet.setView(c, zoom.value, { animate: true })
  }
)
</script>

<template>
  <div class="map-shell">
    <l-map
      ref="mapRef"
      v-model:zoom="zoom"
      :center="mapCenter"
      :options="{ zoomControl: false }"
      class="leaflet-map"
      style='height: 100vh; width: 100vw'
    >
      <l-tile-layer :url="url" :attribution="attribution" />

      <l-marker
        v-for="master in masters"
        :key="master.id"
        :lat-lng="[master.lat, master.lng]"
        :icon="markerIcon"
        @click="focusOn(master)"
      >
        <l-popup>
          <div class="popup-card">
            <div class="popup-head">
              <div class="popup-ic">✂️</div>
              <div class="popup-title-wrap">
                <div class="popup-name">{{ master.name }}</div>
                <div class="popup-sub">
                  <span class="sub-ic" aria-hidden="true">
                    <!-- pin -->
                    <svg viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 22s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
                        stroke="currentColor"
                        stroke-width="2"
                      />
                    </svg>
                  </span>
                  <span class="popup-address">{{ master.address }}</span>
                </div>
              </div>

              <div v-if="master.rating" class="rate-pill" title="Рейтинг">
                ⭐ {{ master.rating }}
              </div>
            </div>

            <button type="button" class="popup-btn" @click="bookMaster(master)">
              <span>Записаться</span>
              <span class="btn-arrow">→</span>
            </button>
          </div>
        </l-popup>
      </l-marker>
    </l-map>

    <!-- Floating controls -->
    <div class="controls">
      <button class="fab" type="button" @click="locateMe" aria-label="Моё местоположение" title="Моё местоположение">
        <!-- target -->
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" stroke="currentColor" stroke-width="2" />
        </svg>
      </button>

      <button class="fab" type="button" @click="resetView" aria-label="Сбросить" title="Сбросить">
        <!-- home -->
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.map-shell {
  position: relative;
  width: 100%;
  height: 100%;
}

/* вместо 100vh/100vw */
.leaflet-map {
  width: 100vw;
  height: 100vh;
}

/* attribution off */
:deep(.leaflet-control-attribution) {
  display: none;
}

/* popup glass */
:deep(.leaflet-popup-content-wrapper) {
  background: rgba(255, 255, 255, 0.88);
  border-radius: 18px;
  padding: 0;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.16);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.6);
}

:deep(.leaflet-popup-content) {
  margin: 0;
  width: 280px !important;
}

:deep(.leaflet-popup-tip) {
  background: rgba(255, 255, 255, 0.88);
}

:deep(.leaflet-popup-close-button) {
  width: 44px !important;
  height: 44px !important;
  font-size: 28px !important;
  line-height: 44px !important;
  padding:  0px !important;
  margin-top: -5px !important;

  display: flex !important;
  align-items: center !important;
  justify-content: center !important;

  color: rgba(15, 23, 42, 0.85) !important;
  top: 6px !important;
  right: 6px !important;
}

/* Marker (divIcon) */
:deep(.km-marker) {
  background: transparent;
  border: none;
}

:deep(.km-marker .mk) {
  width: 42px;
  height: 42px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  border: 2px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: grid;
  place-items: center;
  transform: translateY(-6px);
}

:deep(.km-marker .mk-inner) {
  width: 30px;
  height: 30px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 16px;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.25);
}

/* Popup card */
.popup-card {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.popup-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: start;
}

.popup-ic {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 20px;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.25);
}

.popup-title-wrap {
  min-width: 0;
}

.popup-name {
  font-size: 15px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popup-sub {
  margin-top: 4px;
  display: flex;
  gap: 6px;
  align-items: flex-start;
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.55);
}

.sub-ic {
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  margin-top: 1px;
  color: rgba(15, 23, 42, 0.5);
}
.sub-ic svg {
  width: 14px;
  height: 14px;
}

.popup-address {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rate-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  margin-top: 25px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  color: #0f172a;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
}

/* Button */
.popup-btn {
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.28);
}

.popup-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(102, 126, 234, 0.34);
}
.popup-btn:active {
  transform: translateY(0);
}

.btn-arrow {
  font-size: 18px;
  transition: transform 0.15s ease;
}
.popup-btn:hover .btn-arrow {
  transform: translateX(4px);
}

/* Floating buttons */
.controls {
  position: absolute;
  right: 12px;
  bottom: 94px; /* чтобы не конфликтовало с нижним sheet на ClientMap */
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}
.fab {
  pointer-events: auto;
  width: 44px;
  height: 44px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.16);
  display: grid;
  place-items: center;
  cursor: pointer;
  color: rgba(15, 23, 42, 0.85);
  transition: transform 0.15s ease;
}
.fab:hover { transform: translateY(-1px); }
.fab:active { transform: translateY(0); }
.fab svg { width: 20px; height: 20px; }
</style>
