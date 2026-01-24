// src/types/availability.ts
// Типы для доступности мастера

export type DayLoad = {
  total: number
  booked: number
  free: number
  loadPercent: number // 0..100
}