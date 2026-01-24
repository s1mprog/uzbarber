// src/api/admin.ts
// API для администраторов

import { supabase } from '@/lib/supabase'
import type { Order } from '@/types/order'
import type { UserRole } from '@/shared/auth/role'

/**
 * Получить всех пользователей
 */
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching users:', error)
    return []
  }
  
  return data
}

/**
 * Создать нового пользователя
 */
export async function createUser(userData: {
  telegramId: number
  firstName?: string
  lastName?: string
  username?: string
  phone?: string
  role: UserRole
}) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      telegram_id: userData.telegramId,
      first_name: userData.firstName,
      last_name: userData.lastName,
      username: userData.username,
      phone: userData.phone,
      role: userData.role
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating user:', error)
    throw error
  }
  
  return data
}

/**
 * Создать мастера (пользователь + профиль мастера)
 */
export async function createMaster(masterData: {
  telegramId: number
  firstName?: string
  lastName?: string
  username?: string
  phone?: string
  name: string
  bio?: string
  photoUrl?: string
  address: string
  lat: number
  lng: number
  price30min: number
  price60min: number
}) {
  // 1. Создаём пользователя с ролью master
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      telegram_id: masterData.telegramId,
      first_name: masterData.firstName,
      last_name: masterData.lastName,
      username: masterData.username,
      phone: masterData.phone,
      role: 'master'
    })
    .select()
    .single()
  
  if (userError) {
    console.error('Error creating user:', userError)
    throw userError
  }
  
  // 2. Создаём профиль мастера
  const { data: master, error: masterError } = await supabase
    .from('masters')
    .insert({
      user_id: user.id,
      name: masterData.name,
      bio: masterData.bio,
      photo_url: masterData.photoUrl,
      address: masterData.address,
      lat: masterData.lat,
      lng: masterData.lng,
      price_30min: masterData.price30min,
      price_60min: masterData.price60min,
      is_active: true
    })
    .select()
    .single()
  
  if (masterError) {
    console.error('Error creating master:', masterError)
    throw masterError
  }
  
  return { user, master }
}

/**
 * Изменить роль пользователя
 */
export async function updateUserRole(userId: number, role: UserRole) {
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)
  
  if (error) {
    console.error('Error updating user role:', error)
    throw error
  }
}

/**
 * Удалить пользователя
 */
export async function deleteUser(userId: number) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)
  
  if (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

/**
 * Получить все заказы (с фильтрацией)
 */
export async function getAllOrders(params?: {
  status?: string
  dateFrom?: string
  dateTo?: string
}) {
  let query = supabase
    .from('orders')
    .select(`
      *,
      users!orders_client_id_fkey (
        first_name,
        telegram_id
      ),
      masters (
        name,
        address
      )
    `)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false })
  
  if (params?.status) {
    query = query.eq('status', params.status)
  }
  
  if (params?.dateFrom) {
    query = query.gte('booking_date', params.dateFrom)
  }
  
  if (params?.dateTo) {
    query = query.lte('booking_date', params.dateTo)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching all orders:', error)
    return []
  }
  
  return data.map(order => ({
    id: order.id,
    clientId: order.client_id,
    masterId: order.master_id,
    clientName: order.client_name,
    clientPhone: order.client_phone,
    comment: order.comment,
    bookingDate: order.booking_date,
    startTime: order.start_time.slice(0, 5),
    durationMinutes: order.duration_minutes,
    status: order.status,
    price: order.price,
    tip: order.tip,
    masterName: order.masters?.name,
    masterAddress: order.masters?.address,
    createdAt: order.created_at,
    updatedAt: order.updated_at
  }))
}

/**
 * Обновить статус заказа (админ)
 */
export async function updateOrderStatus(orderId: number, status: string) {
  const updates: any = { status }
  
  if (status === 'done') {
    updates.completed_at = new Date().toISOString()
  } else if (status.includes('canceled')) {
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
 * Удалить заказ
 */
export async function deleteOrder(orderId: number) {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)
  
  if (error) {
    console.error('Error deleting order:', error)
    throw error
  }
}

/**
 * Получить статистику системы
 */
export async function getSystemStats() {
  // Получаем количество пользователей по ролям
  const { data: users } = await supabase
    .from('users')
    .select('role')
  
  // Получаем количество заказов по статусам
  const { data: orders } = await supabase
    .from('orders')
    .select('status, price')
  
  // Получаем количество активных мастеров
  const { data: masters } = await supabase
    .from('masters')
    .select('is_active')
    .eq('is_active', true)
  
  return {
    totalUsers: users?.length || 0,
    clientsCount: users?.filter(u => u.role === 'client').length || 0,
    mastersCount: users?.filter(u => u.role === 'master').length || 0,
    adminsCount: users?.filter(u => u.role === 'admin').length || 0,
    activeMasters: masters?.length || 0,
    totalOrders: orders?.length || 0,
    completedOrders: orders?.filter(o => o.status === 'done').length || 0,
    totalRevenue: orders?.filter(o => o.status === 'done').reduce((sum, o) => sum + (o.price || 0), 0) || 0
  }
}