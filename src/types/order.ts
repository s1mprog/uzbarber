// src/types/order.ts
// Типы для заказов

export type OrderStatus =
  | "done"
  | "in_progress"
  | "booked"
  | "not_accepted"
  | "canceled_by_client"
  | "canceled_by_master"

export type Order = {
  id: number
  clientId: number
  masterId: number
  clientName: string
  clientPhone: string
  comment?: string
  bookingDate: string // YYYY-MM-DD
  startTime: string // HH:mm
  durationMinutes: number
  status: OrderStatus
  price: number
  tip?: number
  createdAt: string
  updatedAt: string
  
  // Дополнительные поля (из join с таблицей masters)
  masterName?: string
  masterAddress?: string
  masterPhoto?: string
  masterRating?: number
}

// Функции для отображения статусов
export function statusLabel(s: OrderStatus): string {
  switch (s) {
    case "done":
      return "Сделанный"
    case "in_progress":
      return "В процессе"
    case "booked":
      return "Забронированный"
    case "not_accepted":
      return "Непринятый"
    case "canceled_by_client":
      return "Отменён пользователем"
    case "canceled_by_master":
      return "Отменён мастером"
  }
}

export function statusBadgeClass(s: OrderStatus): string {
  switch (s) {
    case "done":
      return "bg-green-100 text-green-700"
    case "in_progress":
      return "bg-blue-100 text-blue-700"
    case "booked":
      return "bg-yellow-100 text-yellow-700"
    case "not_accepted":
      return "bg-orange-100 text-orange-700"
    case "canceled_by_client":
      return "bg-gray-200 text-gray-700"
    case "canceled_by_master":
      return "bg-red-100 text-red-700"
  }
}