<script setup lang="ts">
import Map from "@/components/Map.vue"
import type { Master } from "@/types/master"
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { getMastersNearby } from "@/api/client"

const router = useRouter()

const masters = ref<Master[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const userLocation = ref<[number, number]>([41.323766661763415, 69.2429604718647])

const handleBook = (master: Master) => {
  router.push({ name: "ClientMaster", params: { id: master.id } })
}

function reloadPage() {
  window.location.reload()
}

onMounted(async () => {
  try {
    loading.value = true
    const [userLat, userLng] = userLocation.value
    masters.value = await getMastersNearby(userLat, userLng, 10)
  } catch (err) {
    console.error("Error loading masters:", err)
    error.value = "Не удалось загрузить мастеров"
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="client-map-page">
    <!-- Header (glass) -->
    <div class="map-header">
      <div class="header-card">
        <div class="header-text">
          <div class="title-row">
            <span class="title-icon" aria-hidden="true">
              <!-- scissors -->
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 7.5C7 9.43 5.43 11 3.5 11S0 9.43 0 7.5 1.57 4 3.5 4 7 5.57 7 7.5Z"
                  transform="translate(2 1)"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M7 16.5C7 18.43 5.43 20 3.5 20S0 18.43 0 16.5 1.57 13 3.5 13 7 14.57 7 16.5Z"
                  transform="translate(2 1)"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M10 7l12-6M10 17l12 6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <path
                  d="M10 12l6-3"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            <h1 class="header-title">Найдите своего барбера</h1>
          </div>

          <p class="header-subtitle" v-if="loading">
            <span class="sub-icon" aria-hidden="true">
              <!-- loader dot -->
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2a10 10 0 1 0 10 10"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            Загрузка...
          </p>

          <p class="header-subtitle" v-else-if="error">
            <span class="sub-icon" aria-hidden="true">
              <!-- warning -->
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 9v5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <path
                  d="M12 17h.01"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <path
                  d="M10.3 4.4 2.3 18.2A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-2.8L13.7 4.4a2 2 0 0 0-3.4 0Z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            Есть проблема с загрузкой
          </p>

          <p class="header-subtitle" v-else>
            <span class="sub-icon" aria-hidden="true">
              <!-- map pin -->
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
                <path
                  d="M12 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </svg>
            </span>
            Выберите мастера на карте
          </p>
        </div>

        <div class="header-meta" v-if="!loading && !error">
          <span class="badge">
            <span class="dot"></span>
            {{ masters.length }} рядом
          </span>
          <button class="icon-btn" type="button" @click="reloadPage" aria-label="Обновить" title="Обновить">
            <!-- refresh -->
            <svg class="btn-ic" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 12a8 8 0 1 1-2.34-5.66"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
              <path
                d="M20 4v6h-6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Map -->
    <Map
      v-if="!loading && !error && masters.length > 0"
      :masters="masters"
      :center="userLocation"
      @book="handleBook"
    />
    <div v-else class="map-placeholder"></div>

    <!-- Bottom sheet status -->
    <transition name="sheet">
      <div v-if="loading" class="sheet">
        <div class="sheet-card">
          <div class="skeleton-icon"></div>
          <div class="sheet-text">
            <div class="skeleton-line w-60"></div>
            <div class="skeleton-line w-40"></div>
          </div>
        </div>
      </div>
    </transition>

    <transition name="sheet">
      <div v-if="!loading && !!error" class="sheet">
        <div class="sheet-card">
          <div class="sheet-icon error">⚠️</div>
          <div class="sheet-text">
            <p class="sheet-title">Не удалось загрузить мастеров</p>
            <p class="sheet-subtitle">{{ error }}</p>
          </div>
          <button class="primary-btn" type="button" @click="reloadPage">
            Повторить
          </button>
        </div>
      </div>
    </transition>

    <transition name="sheet">
      <div v-if="!loading && !error && masters.length === 0" class="sheet">
        <div class="sheet-card">
          <div class="sheet-icon">🔍</div>
          <div class="sheet-text">
            <p class="sheet-title">Рядом нет доступных мастеров</p>
            <p class="sheet-subtitle">Попробуйте изменить локацию или обновить.</p>
          </div>
          <button class="primary-btn" type="button" @click="reloadPage">
            Обновить
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.client-map-page {
  position: relative;
  width: 100%;
  height: 100%;
  background: #f6f7fb;
}

.map-placeholder {
  width: 100%;
  height: 100%;
}

/* Header overlay */
.map-header {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  z-index: 1000;
  pointer-events: none;
}

.header-card {
  pointer-events: auto;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;

  padding: 14px 14px;
  border-radius: 18px;

  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);

  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);

  border: 1px solid rgba(255, 255, 255, 0.5);
}

.header-text {
  min-width: 0;
}

.title-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.title-icon {
  width: 28px;
  height: 28px;
  border-radius: 12px;
  display: grid;
  place-items: center;

  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
  color: rgba(15, 23, 42, 0.85);
}

.title-icon svg {
  width: 18px;
  height: 18px;
}

.header-title {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.3px;
  color: #0f172a;
  line-height: 1.2;
}

.header-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.65);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  display: flex;
  gap: 8px;
  align-items: center;
}

.sub-icon {
  width: 16px;
  height: 16px;
  color: rgba(15, 23, 42, 0.55);
  display: inline-flex;
}
.sub-icon svg {
  width: 16px;
  height: 16px;
}

.header-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
}

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  padding: 8px 10px;
  border-radius: 999px;

  font-size: 12px;
  font-weight: 900;
  color: #0f172a;

  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15);
}

/* Icon button */
.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  color: rgba(15, 23, 42, 0.85);
  display: grid;
  place-items: center;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.icon-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.10);
}

.icon-btn:active {
  transform: translateY(0);
}

.btn-ic {
  width: 18px;
  height: 18px;
}

/* Bottom sheet */
.sheet {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 1001;
}

.sheet-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;

  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);

  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.16);
}

.sheet-icon {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 22px;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.sheet-icon.error {
  background: rgba(239, 68, 68, 0.10);
  border-color: rgba(239, 68, 68, 0.18);
}

.sheet-text {
  min-width: 0;
}

.sheet-title {
  margin: 0;
  font-size: 14px;
  font-weight: 900;
  color: #0f172a;
  line-height: 1.2;
}

.sheet-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.55);
  line-height: 1.2;
}

/* Primary button */
.primary-btn {
  padding: 10px 14px;
  border-radius: 14px;
  border: none;
  cursor: pointer;

  font-size: 13px;
  font-weight: 900;
  color: #fff;

  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.28);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(102, 126, 234, 0.34);
}

.primary-btn:active {
  transform: translateY(0);
}

/* Skeleton loading */
.skeleton-icon {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.08);
  animation: pulse 1.2s ease-in-out infinite;
}

.skeleton-line {
  height: 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  animation: pulse 1.2s ease-in-out infinite;
  margin: 6px 0;
}

.w-60 { width: 60%; }
.w-40 { width: 40%; }

@keyframes pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

/* Sheet transition */
.sheet-enter-active, .sheet-leave-active {
  transition: all 0.18s ease;
}
.sheet-enter-from, .sheet-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Small screens */
@media (max-width: 375px) {
  .header-title { font-size: 16px; }
  .header-subtitle { font-size: 12px; }
  .badge { padding: 7px 9px; }
}
</style>
