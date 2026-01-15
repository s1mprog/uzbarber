<script setup lang="ts">
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()

const items = [
  { name: "AdminUsers", label: "Users", path: "/admin/users" },
  { name: "AdminOrders", label: "Orders", path: "/admin/orders" }
]

function go(path: string) {
  router.push(path)
}
function isActive(name: string) {
  return route.name === name
}
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t">
    <div class="grid grid-cols-2 gap-2 p-2">
      <button
        v-for="it in items"
        :key="it.name"
        class="rounded-xl py-3 text-sm transition"
        :class="isActive(it.name) ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'"
        @click="go(it.path)"
      >
        {{ it.label }}
      </button>
    </div>
  </div>
</template>
