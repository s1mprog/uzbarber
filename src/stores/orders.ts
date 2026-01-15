import { defineStore } from "pinia"
import { MOCK_ORDERS, type MasterOrder, type OrderStatus } from "@/api/mock/masterOrders"

const LS_KEY = "ORDERS_V1"

function load(): MasterOrder[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return [...MOCK_ORDERS]
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return [...MOCK_ORDERS]
  } catch {
    return [...MOCK_ORDERS]
  }
}

function save(data: MasterOrder[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

export const useOrdersStore = defineStore("orders", {
  state: () => ({
    orders: load() as MasterOrder[]
  }),

  actions: {
    setStatus(id: string, status: OrderStatus) {
      const o = this.orders.find((x) => x.id === id)
      if (!o) return
      o.status = status
      save(this.orders)
    }
  }
})
