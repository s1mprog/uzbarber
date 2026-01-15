<script setup lang="ts">
import { computed, ref } from "vue"
import { MOCK_ORDERS, statusBadgeClass, statusLabel, type MasterOrder } from "@/api/mock/masterOrders"

const orders = ref<MasterOrder[]>([...MOCK_ORDERS])

const today = new Date()
const pad = (n: number) => String(n).padStart(2, "0")
const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

const todayOrders = computed(() => orders.value.filter((o) => o.date === todayKey).sort((a, b) => a.time.localeCompare(b.time)))

function acceptOrder(id: string) {
  const o = orders.value.find((x) => x.id === id)
  if (!o) return
  o.status = "booked"
}

function rejectOrder(id: string) {
  const o = orders.value.find((x) => x.id === id)
  if (!o) return
  o.status = "canceled_by_master"
}
</script>

<template>
  <div class="p-4 space-y-3">
    <h1 class="text-xl font-bold">Сегодня</h1>
    <p class="text-sm text-gray-500">{{ todayKey }}</p>

    <div v-if="todayOrders.length === 0" class="rounded-2xl bg-white p-4 shadow">
      Сегодня заказов нет.
    </div>

    <div v-for="o in todayOrders" :key="o.id" class="rounded-2xl bg-white p-4 shadow space-y-2">
      <div class="flex items-center justify-between">
        <div class="font-semibold">{{ o.time }} — {{ o.clientName }}</div>
        <span class="text-xs px-2 py-1 rounded-full" :class="statusBadgeClass(o.status)">
          {{ statusLabel(o.status) }}
        </span>
      </div>

      <div class="text-sm text-gray-600">{{ o.clientPhone }}</div>
      <div v-if="o.comment" class="text-sm text-gray-700">Комментарий: {{ o.comment }}</div>

      <div v-if="o.status === 'not_accepted'" class="grid grid-cols-2 gap-2 pt-2">
        <button class="rounded-xl bg-black text-white p-3" @click="acceptOrder(o.id)">Принять</button>
        <button class="rounded-xl bg-gray-200 text-gray-800 p-3" @click="rejectOrder(o.id)">Отклонить</button>
      </div>
    </div>
  </div>
</template>
