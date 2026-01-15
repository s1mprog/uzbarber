import type { Master } from "@/types/master"
import { mockGetMasterById, mockGetMastersNearby } from "@/api/mock/master"
import {
  mockGetMonthLoad,
  mockGetTimeSlots24h,
  mockGetBookedHours,
  type DayLoad
} from "@/api/mock/availability"

export async function getMastersNearby(): Promise<Master[]> {
  return mockGetMastersNearby()
}

export async function getMasterById(id: number): Promise<Master | null> {
  return mockGetMasterById(id)
}

export async function getMonthLoad(params: {
  masterId: number
  year: number
  month: number // 1..12
}): Promise<Record<string, DayLoad>> {
  return mockGetMonthLoad(params)
}

export async function getTimeSlots24h(): Promise<{ start: string; end: string }[]> {
  return mockGetTimeSlots24h()
}

// ✅ NEW
export async function getBookedHours(params: { masterId: number; date: string }): Promise<string[]> {
  return mockGetBookedHours(params)
}
