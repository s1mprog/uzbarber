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
    
    console.log('Loaded masters:', masters.value)
  } catch (err) {
    console.error('Error loading masters:', err)
    error.value = 'Не удалось загрузить мастеров'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="client-map-page">
    <!-- Заголовок поверх карты -->
    <div class="map-header">
      <div class="header-content">
        <h1 class="header-title">Найдите своего барбера</h1>
        <p class="header-subtitle" v-if="loading">
          Загрузка...
        </p>
        <p class="header-subtitle" v-else-if="!error">
          {{ masters.length }} мастеров рядом
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="center-message">
      <div class="loading-spinner"></div>
      <p>Загрузка мастеров...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="center-message">
      <div class="error-icon">⚠️</div>
      <p class="error-text">{{ error }}</p>
      <button 
        @click="reloadPage"
        class="retry-btn"
      >
        Попробовать снова
      </button>
    </div>

    <!-- Map -->
    <Map 
      v-else-if="masters.length > 0"
      :masters="masters" 
      :center="userLocation" 
      @book="handleBook" 
    />

    <!-- Empty -->
    <div v-else class="center-message">
      <div class="empty-icon">🔍</div>
      <p>Рядом нет доступных мастеров</p>
    </div>
  </div>
</template>

<style scoped>
/* Страница на весь экран */
.client-map-page {
  position: relative;
  width: 100%;
  height: 100%;
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

/* Центрированные сообщения */
.center-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, 150%);
  text-align: center;
  background: white;
  padding: 32px 24px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 1001;
  min-width: 280px;
}

/* Loading spinner */
.loading-spinner {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.center-message p {
  margin: 0;
  font-size: 16px;
  color: #666;
  font-weight: 500;
}

/* Error */
.error-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.error-text {
  color: #ef4444 !important;
  margin-bottom: 16px !important;
}

.retry-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.retry-btn:active {
  transform: translateY(0);
}

/* Empty */
.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

/* Responsive */
@media (max-width: 375px) {
  .header-title {
    font-size: 22px;
  }
  
  .header-subtitle {
    font-size: 13px;
  }
  
  .center-message {
    min-width: 240px;
    padding: 24px 20px;
  }
}
</style>