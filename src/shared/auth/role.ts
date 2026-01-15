// src/auth/role.ts
import { ACCESS } from "@/config/access"  
export type UserRole = "client" | "master" | "admin"

type TelegramUser = {
  id?: number
  username?: string
  first_name?: string
  last_name?: string
}

import.meta.env.VITE_TEST
import.meta.env.VITE_TG_INIT_DATA
/**
 * Возвращает Telegram initData строку.
 * В проде: window.Telegram.WebApp.initData
 * В деве: можно подменять через .env или localStorage
*/
export function getTelegramInitData(): string {
  
  // 1) Реальное initData из Telegram Mini App
  const tgInitData = (window as any)?.Telegram?.WebApp?.initData
  if (typeof tgInitData === "string" && tgInitData.length > 0) return tgInitData

  // 2) DEV fallback: env (например VITE_TG_INIT_DATA)
  const envInitData = import.meta.env.VITE_TG_INIT_DATA
  if (typeof envInitData === "string" && envInitData.length > 0) return envInitData

  // 3) DEV fallback: localStorage
  const ls = localStorage.getItem("TG_INIT_DATA")
  if (typeof ls === "string" && ls.length > 0) return ls

  return ""

}

/**
 * Достаёт user из initData (querystring), где user = JSON строка.
 * Важно: это "быстрый парсер" для фронта. В реальности подлинность initData
 * должен проверять backend, а фронт роли должен получать от API.
 */
export function parseTelegramUser(initData: string): TelegramUser | null {
  if (!initData) return null

  try {
    const params = new URLSearchParams(initData)
    const userRaw = params.get("user")
    if (!userRaw) return null

    const user = JSON.parse(userRaw)
    if (user && typeof user === "object") return user as TelegramUser
    return null
  } catch {
    return null
  }
}

/**
 * Временная логика ролей (mock), пока нет backend.
 * Потом заменишь на запрос типа GET /me -> role.
 */

export function resolveRoleMock(userId?: number): UserRole {
  if (userId && ACCESS.adminIds.includes(userId)) return "admin"
  if (userId && ACCESS.masterIds.includes(userId)) return "master"
  return "client"
}

/**
 * Главная функция для фронта:
 * определяем роль из initData (с fallback на client)
 */
export function getUserRole(): UserRole {
  const initData = getTelegramInitData()
  const user = parseTelegramUser(initData)
  const userId = user?.id

  // Пока нет backend — используем мок.
  // Позже сделаешь: return authStore.role (полученную с API)
  return resolveRoleMock(userId)
}
