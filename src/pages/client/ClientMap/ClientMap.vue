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
  <div class="client-map p-4">
    <h2 class="text-lg font-semibold mb-3">Выберите барбера на карте</h2>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Загрузка мастеров...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">{{ error }}</p>
      <button 
        @click="reloadPage"
        class="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Попробовать снова
      </button>
    </div>

    <Map 
      v-else
      :masters="masters" 
      :center="userLocation" 
      @book="handleBook" 
    />

    <div v-if="!loading && !error && masters.length === 0" class="text-center py-8">
      <p class="text-gray-500">Рядом нет доступных мастеров</p>
    </div>
  </div>
</template>

<style scoped>
.client-map {
  width: 100%;
}
</style>