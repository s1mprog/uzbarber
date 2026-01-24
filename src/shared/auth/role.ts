// src/shared/auth/role.ts
import { supabase } from '@/lib/supabase'

export type UserRole = "client" | "master" | "admin"

type TelegramUser = {
  id?: number
  username?: string
  first_name?: string
  last_name?: string
}

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
 * Получить Telegram user из WebApp
 */
export function getTelegramUser(): TelegramUser | null {
  const unsafeUser = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user
  if (unsafeUser && typeof unsafeUser === "object") return unsafeUser as TelegramUser

  // fallback: парсинг initData строки
  const initData = getTelegramInitData()
  return parseTelegramUser(initData)
}

// Кеш для роли пользователя
let cachedRole: UserRole | null = null
let cachedTelegramId: number | null = null

/**
 * Получить роль пользователя из базы данных
 */
export async function getUserRoleFromDB(telegramId: number): Promise<UserRole> {
  try {
    // Проверяем кеш
    if (cachedTelegramId === telegramId && cachedRole) {
      return cachedRole
    }

    // Получаем пользователя из базы
    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('telegram_id', telegramId)
      .single()

    if (error) {
      console.error('Error fetching user role:', error)
      return 'client' // По умолчанию клиент
    }

    if (user && user.role) {
      // Кешируем роль
      cachedRole = user.role as UserRole
      cachedTelegramId = telegramId
      return user.role as UserRole
    }

    return 'client'
  } catch (err) {
    console.error('Error in getUserRoleFromDB:', err)
    return 'client'
  }
}

/**
 * Синхронная функция для получения роли (для router guards)
 * Использует кешированное значение
 */
export function getUserRole(): UserRole {
  // Если роль закеширована - возвращаем её
  if (cachedRole) {
    return cachedRole
  }

  // Иначе возвращаем client по умолчанию
  // Роль будет обновлена асинхронно через initUserRole()
  return 'client'
}

/**
 * Инициализировать роль пользователя при старте приложения
 * Эту функцию нужно вызвать в main.ts или App.vue
 */
export async function initUserRole(): Promise<UserRole> {
  const tgUser = getTelegramUser()
  
  if (!tgUser?.id) {
    console.warn('No Telegram user found')
    cachedRole = 'client'
    return 'client'
  }

  const role = await getUserRoleFromDB(tgUser.id)
  console.log('User role initialized:', role)
  return role
}

/**
 * Очистить кеш роли (для logout или смены пользователя)
 */
export function clearRoleCache() {
  cachedRole = null
  cachedTelegramId = null
}