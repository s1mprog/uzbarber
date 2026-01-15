export type DayLoad = {
  total: number
  booked: number
  free: number
  loadPercent: number // 0..100
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// стабильный seed для одной даты и мастера
function seedNumber(masterId: number, dateKey: string) {
  let s = masterId * 99991
  for (let i = 0; i < dateKey.length; i++) s += dateKey.charCodeAt(i) * (i + 7)
  return s
}

function hourToTime(h: number) {
  return `${pad(h)}:00`
}

export async function mockGetMonthLoad(params: {
  masterId: number
  year: number
  month: number // 1..12
}): Promise<Record<string, DayLoad>> {
  const { masterId, year, month } = params
  const daysInMonth = new Date(year, month, 0).getDate()

  const result: Record<string, DayLoad> = {}
  const TOTAL_SLOTS = 24 // 24 часа

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day)
    const key = ymd(d)

    const seed = seedNumber(masterId, key)
    const booked = Math.min(22, Math.max(0, seed % 23))
    const free = Math.max(0, TOTAL_SLOTS - booked)
    const loadPercent = Math.round((booked / TOTAL_SLOTS) * 100)

    result[key] = { total: TOTAL_SLOTS, booked, free, loadPercent }
  }

  return Promise.resolve(result)
}

export function mockGetTimeSlots24h(): Promise<{ start: string; end: string }[]> {
  const slots: { start: string; end: string }[] = []
  for (let h = 0; h < 24; h++) {
    const start = `${pad(h)}:00`
    const end = `${pad((h + 1) % 24)}:00`
    slots.push({ start, end })
  }
  return Promise.resolve(slots)
}

/**
 * NEW: возвращает список забронированных часов (start times "HH:00") на конкретную дату.
 * Делает это детерминированно (чтобы данные были стабильными).
 */
/**
 * NEW (fixed): возвращает список забронированных часов (start times "HH:00") на конкретную дату.
 * Без while — всегда быстро и стабильно.
 */
export async function mockGetBookedHours(params: {
  masterId: number
  date: string // YYYY-MM-DD
}): Promise<string[]> {
  const { masterId, date } = params
  const TOTAL_SLOTS = 24

  const seed = seedNumber(masterId, date)
  const bookedCount = Math.min(22, Math.max(0, seed % 23)) // как и раньше

  // маленький seeded RNG (xorshift32)
  let x = (seed | 0) || 123456789
  const rand = () => {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    return ((x >>> 0) / 4294967296) // 0..1
  }

  // часы 0..23
  const hours = Array.from({ length: TOTAL_SLOTS }, (_, i) => i)

  // Fisher–Yates shuffle (детерминированно)
  for (let i = hours.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))

    const tmp = hours[i]!
    hours[i] = hours[j]!
    hours[j] = tmp
  }


  const booked = hours
    .slice(0, bookedCount)
    .sort((a, b) => a - b)
    .map((h) => hourToTime(h))

  return Promise.resolve(booked)
}
