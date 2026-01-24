import { supabase } from '@/lib/supabase'

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
  return data
}

export async function cancelOrder(orderId: number, canceledBy: 'client' | 'master') {
  const status = canceledBy === 'client' ? 'canceled_by_client' : 'canceled_by_master'
  
  const { error } = await supabase
    .from('orders')
    .update({ 
      status,
      canceled_at: new Date().toISOString()
    })
    .eq('id', orderId)
  
  if (error) throw error
}