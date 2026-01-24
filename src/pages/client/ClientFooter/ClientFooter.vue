<script setup lang="ts">
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()

const isMapActive = computed(() => route.name === 'ClientMap')
const isHistoryActive = computed(() => route.name === 'ClientHistory')

function goToMap() {
  router.push({ name: 'ClientMap' })
}

function goToHistory() {
  router.push({ name: 'ClientHistory' })
}
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 safe-bottom">
    <div class="grid grid-cols-2 gap-2">
      <!-- Карта -->
      <button 
        class="flex flex-col items-center justify-center py-2 rounded-xl transition-colors"
        :class="isMapActive ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'"
        @click="goToMap"
      >
        <svg 
          class="w-6 h-6 mb-1" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <span class="text-xs font-medium">Карта</span>
      </button>

      <!-- История -->
      <button 
        class="flex flex-col items-center justify-center py-2 rounded-xl transition-colors"
        :class="isHistoryActive ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'"
        @click="goToHistory"
      >
        <svg 
          class="w-6 h-6 mb-1" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span class="text-xs font-medium">История</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Safe area для iOS */
.safe-bottom {
  padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
}
</style>