// src/api/client.ts
// Главный файл API для клиентов - использует Supabase

import type { Master } from "@/types/master"
import type { DayLoad } from "@/types/availability"
import { supabase } from '@/lib/supabase'

// ============================================
// MASTERS
// ============================================

export async function getMastersNearby(
  lat: number = 41.3289,
  lng: number = 69.2482,
  radius: number = 10
): Promise<Master[]> {
  const { data, error } = await supabase.rpc('get_nearby_masters', {
    user_lat: lat,
    user_lng: lng,
    radius_km: radius
  })
  
  if (error) {
    console.error('Error fetching masters:', error)
    return []
  }
  
  return data as Master[]
}

export async function getMasterById(id: number): Promise<Master | null> {
  const { data, error } = await supabase
    .from('masters')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching master:', error)
    return null
  }
  
  return data as Master
}

// ============================================
// AVAILABILITY
// ============================================

export async function getMonthLoad(params: {
  masterId: number
  year: number
  month: number
}): Promise<Record<string, DayLoad>> {
  const { masterId, year, month } = params
  
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  
  const { data: orders } = await supabase
    .from('orders')
    .select('booking_date, duration_minutes')
    .eq('master_id', masterId)
    .gte('booking_date', firstDay.toISOString().split('T')[0])
    .lte('booking_date', lastDay.toISOString().split('T')[0])
    .not('status', 'in', '(canceled_by_client,canceled_by_master)')
  
  const result: Record<string, DayLoad> = {}
  const daysInMonth = lastDay.getDate()
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    const dateKey = date.toISOString().split('T')[0] as string
    
    const dayOrders = orders?.filter(o => o.booking_date === dateKey) || []
    const bookedMinutes = dayOrders.reduce((sum, o) => sum + o.duration_minutes, 0)
    const bookedHours = Math.ceil(bookedMinutes / 60)
    
    const TOTAL_SLOTS = 10
    const free = Math.max(0, TOTAL_SLOTS - bookedHours)
    
    result[dateKey] = {
      total: TOTAL_SLOTS,
      booked: bookedHours,
      free,
      loadPercent: Math.round((bookedHours / TOTAL_SLOTS) * 100)
    }
  }
  
  return result
}

export async function getBookedHours(params: {
  masterId: number
  date: string
}): Promise<string[]> {
  const { data } = await supabase
    .from('orders')
    .select('start_time')
    .eq('master_id', params.masterId)
    .eq('booking_date', params.date)
    .not('status', 'in', '(canceled_by_client,canceled_by_master)')
  
  return data?.map(o => o.start_time.slice(0, 5)) || []
}

export async function getTimeSlots24h(): Promise<{ start: string; end: string }[]> {
  const slots: { start: string; end: string }[] = []
  for (let h = 0; h < 24; h++) {
    const start = `${String(h).padStart(2, '0')}:00`
    const end = `${String((h + 1) % 24).padStart(2, '0')}:00`
    slots.push({ start, end })
  }
  return slots
}

// ============================================
// ORDERS
// ============================================

export async function createOrder(orderData: {
  clientId: number
  masterId: number
  bookingDate: string
  startTime: string
  durationMinutes: number
  clientName: string
  clientPhone: string
  comment?: string
  price: number
}) {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      client_id: orderData.clientId,
      master_id: orderData.masterId,
      booking_date: orderData.bookingDate,
      start_time: orderData.startTime,
      duration_minutes: orderData.durationMinutes,
      client_name: orderData.clientName,
      client_phone: orderData.clientPhone,
      comment: orderData.comment,
      price: orderData.price
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getOrderById(orderId: number) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      masters (
        name,
        address,
        photo_url,
        rating
      )
    `)
    .eq('id', orderId)
    .single()
  
  if (error) throw error
  
  return {
    ...data,
    masterName: data.masters?.name,
    masterAddress: data.masters?.address,
    masterPhoto: data.masters?.photo_url,
    masterRating: data.masters?.rating
  }
}

export async function cancelOrder(orderId: number) {
  const { error } = await supabase
    .from('orders')
    .update({ 
      status: 'canceled_by_client',
      canceled_at: new Date().toISOString()
    })
    .eq('id', orderId)
  
  if (error) throw error
}

/**
 * Получить все заказы текущего клиента
 */
export async function getMyOrders(clientId: number) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      masters (
        name,
        address
      )
    `)
    .eq('client_id', clientId)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false })
  
  if (error) {
    console.error('Error fetching my orders:', error)
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