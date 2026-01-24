// src/api/master.ts
// API для мастеров

import { supabase } from '@/lib/supabase'
import type { Order } from '@/types/order'

/**
 * Получить профиль мастера по user_id
 */
export async function getMasterProfile(userId: number) {
  const { data, error } = await supabase
    .from('masters')
    .select(`
      *,
      users!masters_user_id_fkey (
        telegram_id,
        first_name,
        last_name,
        username,
        phone
      )
    `)
    .eq('user_id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching master profile:', error)
    throw error
  }
  
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    bio: data.bio,
    photoUrl: data.photo_url,
    address: data.address,
    lat: data.lat,
    lng: data.lng,
    rating: data.rating,
    price30min: data.price_30min,
    price60min: data.price_60min,
    isActive: data.is_active,
    // Данные из users
    telegramId: data.users?.telegram_id,
    firstName: data.users?.first_name,
    lastName: data.users?.last_name,
    username: data.users?.username,
    phone: data.users?.phone
  }
}

/**
 * Получить профиль мастера по telegram_id
 */
export async function getMasterProfileByTelegramId(telegramId: number) {
  // Сначала получаем user_id
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', telegramId)
    .eq('role', 'master')
    .single()
  
  if (userError || !user) {
    console.error('Master user not found:', userError)
    throw new Error('Master user not found')
  }
  
  return getMasterProfile(user.id)
}

/**
 * Обновить профиль мастера
 */
export async function updateMasterProfile(userId: number, updates: {
  name?: string
  bio?: string
  photoUrl?: string
  address?: string
  lat?: number
  lng?: number
  price30min?: number
  price60min?: number
}) {
  const dbUpdates: any = {}
  
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.bio !== undefined) dbUpdates.bio = updates.bio
  if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl
  if (updates.address !== undefined) dbUpdates.address = updates.address
  if (updates.lat !== undefined) dbUpdates.lat = updates.lat
  if (updates.lng !== undefined) dbUpdates.lng = updates.lng
  if (updates.price30min !== undefined) dbUpdates.price_30min = updates.price30min
  if (updates.price60min !== undefined) dbUpdates.price_60min = updates.price60min
  
  const { error } = await supabase
    .from('masters')
    .update(dbUpdates)
    .eq('user_id', userId)
  
  if (error) {
    console.error('Error updating master profile:', error)
    throw error
  }
}

/**
 * Обновить телефон пользователя
 */
export async function updateUserPhone(userId: number, phone: string) {
  const { error } = await supabase
    .from('users')
    .update({ phone })
    .eq('id', userId)
  
  if (error) {
    console.error('Error updating user phone:', error)
    throw error
  }
}

/**
 * Получить заказы мастера на конкретную дату
 */
export async function getMasterOrders(params: {
  masterId: number
  date?: string // YYYY-MM-DD, если не указано - все заказы
}) {
  let query = supabase
    .from('orders')
    .select(`
      *,
      users!orders_client_id_fkey (
        first_name,
        phone
      )
    `)
    .eq('master_id', params.masterId)
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })
  
  if (params.date) {
    query = query.eq('booking_date', params.date)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching master orders:', error)
    return []
  }
  
  // Преобразуем в удобный формат
  return data.map(order => ({
    id: order.id,
    clientId: order.client_id,
    masterId: order.master_id,
    clientName: order.client_name,
    clientPhone: order.client_phone,
    comment: order.comment,
    bookingDate: order.booking_date,
    startTime: order.start_time.slice(0, 5), // HH:mm
    durationMinutes: order.duration_minutes,
    status: order.status,
    price: order.price,
    tip: order.tip,
    createdAt: order.created_at,
    updatedAt: order.updated_at
  })) as Order[]
}

/**
 * Получить заказы мастера за сегодня
 */
export async function getTodayOrders(masterId: number) {
  const today = new Date()
  const dateKey = today.toISOString().split('T')[0]
  
  return getMasterOrders({ masterId, date: dateKey })
}

/**
 * Обновить статус заказа (мастер)
 */
export async function updateOrderStatus(orderId: number, status: string) {
  const updates: any = { status }
  
  // Автоматически проставляем timestamps
  if (status === 'done') {
    updates.completed_at = new Date().toISOString()
  } else if (status === 'canceled_by_master') {
    updates.canceled_at = new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
  
  if (error) {
    console.error('Error updating order status:', error)
    throw error
  }
}

/**
 * Принять заказ (not_accepted -> booked)
 */
export async function acceptOrder(orderId: number) {
  return updateOrderStatus(orderId, 'booked')
}

/**
 * Отклонить заказ (not_accepted -> canceled_by_master)
 */
export async function rejectOrder(orderId: number) {
  return updateOrderStatus(orderId, 'canceled_by_master')
}

/**
 * Получить статистику мастера
 */
export async function getMasterStats(params: {
  masterId: number
  dateFrom: string // YYYY-MM-DD
  dateTo: string // YYYY-MM-DD
}) {
  const { data, error } = await supabase.rpc('get_master_stats', {
    p_master_id: params.masterId,
    p_date_from: params.dateFrom,
    p_date_to: params.dateTo
  })
  
  if (error) {
    console.error('Error fetching master stats:', error)
    return null
  }
  
  return data
}

// Добавь эту функцию в src/api/master.ts в самое начало:

/**
 * Получить master_id по user_id
 */
export async function getMasterIdByUserId(userId: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('masters')
    .select('id')
    .eq('user_id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching master_id:', error)
    return null
  }
  
  return data?.id || null
}

/**
 * Получить master_id по telegram_id
 */
export async function getMasterIdByTelegramId(telegramId: number): Promise<number | null> {
  // Сначала получаем user_id
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', telegramId)
    .eq('role', 'master')
    .single()
  
  if (userError || !user) {
    console.error('Master user not found:', userError)
    return null
  }
  
  // Затем получаем master_id
  return getMasterIdByUserId(user.id)
}