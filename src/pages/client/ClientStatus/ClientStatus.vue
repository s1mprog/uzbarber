<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRoute } from "vue-router"
import BackButton from "@/components/BackButton.vue"
import { useRouter } from "vue-router"


const route = useRoute()
const router = useRouter()
const status = ref<"pending_master" | "confirmed">("pending_master")

onMounted(() => {
	// mock: через 3 секунды подтвердим
  setTimeout(() => {
		status.value = "confirmed"
  }, 3000)
})
function goBack() {
	if (window.history.length > 1) router.back()
	else router.replace({ name: "ClientMap" })
}
</script>

<template>
  <div class="p-4">
		<BackButton @click="goBack" />
    <h1 class="text-xl font-bold">Статус заявки</h1>
    <p class="text-sm text-gray-500">Booking ID: {{ route.params.bookingId }}</p>

    <div class="mt-4 rounded-xl bg-white p-4 shadow">
      <div v-if="status === 'pending_master'">⏳ Ждём подтверждения мастера...</div>
      <div v-else>✅ Мастер подтвердил запись!</div>
    </div>
  </div>
</template>
