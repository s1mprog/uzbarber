// src/api/auth.ts
// API для авторизации и работы с пользователями

import { supabase } from '@/lib/supabase'
import { getTelegramUser } from '@/shared/auth/role'

/**
 * Получить или создать текущего пользователя в базе
 */
export async function getCurrentUser() {
  const tgUser = getTelegramUser()
  
  if (!tgUser || !tgUser.id) {
    throw new Error('Telegram user not found')
  }
  
  // Проверяем есть ли пользователь в базе
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', tgUser.id)
    .single()
  
  if (existingUser) {
    return existingUser
  }
  
  // Если нет - создаём нового
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      telegram_id: tgUser.id,
      first_name: tgUser.first_name,
      last_name: tgUser.last_name,
      username: tgUser.username,
      role: 'client'
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating user:', error)
    throw error
  }
  
  return newUser
}

/**
 * Получить ID текущего пользователя
 */
export async function getCurrentUserId(): Promise<number> {
  const user = await getCurrentUser()
  return user.id
}