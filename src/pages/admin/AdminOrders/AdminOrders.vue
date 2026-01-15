<script setup lang="ts">
import { computed, ref } from "vue"
import { useOrdersStore } from "@/stores/orders"
import { statusBadgeClass, statusLabel, type OrderStatus } from "@/api/mock/masterOrders"

const ordersStore = useOrdersStore()

const filter = ref<OrderStatus | "all">("all")

const allStatuses: Array<OrderStatus | "all"> = [
  "all",
  "not_accepted",
  "booked",
  "in_progress",
  "done",
  "canceled_by_client",
  "canceled_by_master"
]

const orders = computed(() => {
  const list = [...ordersStore.orders].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  if (filter.value === "all") return list
  return list.filter((o) => o.status === filter.value)
})

function changeStatus(id: string, status: OrderStatus) {
  ordersStore.setStatus(id, status)
}
</script>

<template>
  <div class="p-4 space-y-3">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold">Orders</h1>

      <select
        class="rounded-xl border border-gray-200 px-3 py-2 text-sm"
        v-model="filter"
      >
        <option v-for="s in allStatuses" :key="s" :value="s">
          {{ s === "all" ? "all" : statusLabel(s as any) }}
        </option>
      </select>
    </div>

    <div v-for="o in orders" :key="o.id" class="rounded-2xl bg-white p-4 shadow space-y-2">
      <div class="flex items-center justify-between">
        <div class="font-semibold">{{ o.date }} • {{ o.time }} — {{ o.clientName }}</div>
        <span class="text-xs px-2 py-1 rounded-full" :class="statusBadgeClass(o.status)">
          {{ statusLabel(o.status) }}
        </span>
      </div>

      <div class="text-sm text-gray-600">{{ o.clientPhone }}</div>
      <div v-if="o.comment" class="text-sm text-gray-700">Комментарий: {{ o.comment }}</div>

      <div class="pt-2">
        <label class="text-xs text-gray-500">Изменить статус</label>
        <select
          class="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          :value="o.status"
          @change="changeStatus(o.id, ($event.target as HTMLSelectElement).value as OrderStatus)"
        >
          <option value="not_accepted">Непринятый</option>
          <option value="booked">Забронированный</option>
          <option value="in_progress">В процессе</option>
          <option value="done">Сделанный</option>
          <option value="canceled_by_client">Отменён пользователем</option>
          <option value="canceled_by_master">Отменён мастером</option>
        </select>
      </div>
    </div>
  </div>
</template>
