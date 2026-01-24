// supabase/functions/send-reminders/index.ts
// Edge Function для отправки напоминаний за 2 часа до записи
// Запускается каждые 15 минут через Supabase Cron

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''

async function sendTelegramMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    })
  })
}

serve(async (req) => {
  try {
    // Получаем текущее время + 2 часа
    const now = new Date()
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    
    const targetDate = twoHoursLater.toISOString().split('T')[0]
    const targetTime = twoHoursLater.toTimeString().slice(0, 5) // HH:mm
    
    console.log('Looking for orders at:', targetDate, targetTime)
    
    // Находим заказы через 2 часа со статусом 'booked'
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        start_time,
        users!orders_client_id_fkey(telegram_chat_id),
        masters(name, address)
      `)
      .eq('booking_date', targetDate)
      .eq('status', 'booked')
      .gte('start_time', targetTime)
      .lte('start_time', `${targetTime}:59`)
    
    if (error) throw error
    
    console.log(`Found ${orders?.length || 0} orders to remind`)
    
    // Отправляем напоминания
    for (const order of orders || []) {
      const clientChatId = order.users?.telegram_chat_id
      
      if (!clientChatId) {
        console.log('No chat_id for order:', order.id)
        continue
      }
      
      const text = `
⏰ <b>Напоминание о записи</b>

Через 2 часа у вас запись:

💈 Мастер: ${order.masters.name}
📍 Адрес: ${order.masters.address}
🕐 Время: ${order.start_time}

До встречи!
      `.trim()
      
      try {
        await sendTelegramMessage(clientChatId, text)
        console.log('Reminder sent for order:', order.id)
      } catch (err) {
        console.error('Failed to send reminder for order:', order.id, err)
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        reminders_sent: orders?.length || 0 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error in send-reminders:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})