import type { Master } from "@/types/master"

export const MOCK_MASTERS: Master[] = [
  {
    id: 1,
    name: "Мастер Иван",
    lat: 41.34125936014218,
    lng: 69.24285354126796,
    address: "Nurafshon kochasi 14, Toshkent, Uzbekistan",
    rating: 4.8
  },
  {
    id: 2,
    name: "Barber Ali",
    lat: 41.3289,
    lng: 69.2482,
    address: "Tashkent City, Uzbekistan",
    rating: 4.6
  }
]

export function mockGetMastersNearby(): Promise<Master[]> {
  return Promise.resolve(MOCK_MASTERS)
}

export function mockGetMasterById(id: number): Promise<Master | null> {
  const m = MOCK_MASTERS.find((x) => x.id === id) || null
  return Promise.resolve(m)
}
