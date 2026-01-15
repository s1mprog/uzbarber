export type OrderStatus =
  | "done"
  | "in_progress"
  | "booked"
  | "not_accepted"
  | "canceled_by_client"
  | "canceled_by_master"

export type MasterOrder = {
  id: string
  clientName: string
  clientPhone: string
  comment?: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  status: OrderStatus
}

const today = new Date()
const pad = (n: number) => String(n).padStart(2, "0")
const ymd = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

export const MOCK_ORDERS: MasterOrder[] = [
  { id: "1", clientName: "Aziz", clientPhone: "+998901112233", date: ymd, time: "10:00", status: "not_accepted", comment: "Фейд" },
  { id: "2", clientName: "Sardor", clientPhone: "+998909998877", date: ymd, time: "12:00", status: "booked" },
  { id: "3", clientName: "Bek", clientPhone: "+998935551122", date: ymd, time: "14:00", status: "in_progress" },
  { id: "4", clientName: "Timur", clientPhone: "+998977771122", date: ymd, time: "16:00", status: "done" },
  { id: "5", clientName: "Jasur", clientPhone: "+998900001122", date: "2026-01-18", time: "09:00", status: "canceled_by_client" },
  { id: "6", clientName: "Karim", clientPhone: "+998901234567", date: "2026-01-19", time: "11:00", status: "canceled_by_master" }
]

export function statusLabel(s: OrderStatus) {
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

export function statusBadgeClass(s: OrderStatus) {
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
