// src/api/telegram.ts
// API для отправки Telegram уведомлений

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN

/**
 * Отправить сообщение в Telegram
 */
async function sendTelegramMessage(params: {
  chatId: number
  text: string
  parseMode?: 'HTML' | 'Markdown'
}) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: params.chatId,
        text: params.text,
        parse_mode: params.parseMode || 'HTML'
      })
    })
    
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error sending Telegram message:', error)
    throw error
  }
}

/**
 * Уведомление мастеру о новом заказе
 */
export async function notifyMasterNewOrder(params: {
  masterChatId: number
  clientName: string
  clientPhone: string
  bookingDate: string
  startTime: string
  comment?: string
  price: number
}) {
  const text = `
🔔 <b>Новый заказ!</b>

👤 Клиент: ${params.clientName}
📱 Телефон: ${params.clientPhone}
📅 Дата: ${params.bookingDate}
🕐 Время: ${params.startTime}
${params.comment ? `💬 Комментарий: ${params.comment}` : ''}
💰 Сумма: ${params.price.toLocaleString()} сум

⏳ Ожидает подтверждения
  `.trim()
  
  return sendTelegramMessage({
    chatId: params.masterChatId,
    text,
    parseMode: 'HTML'
  })
}

/**
 * Уведомление клиенту что мастер принял заказ
 */
export async function notifyClientOrderAccepted(params: {
  clientChatId: number
  masterName: string
  masterAddress: string
  bookingDate: string
  startTime: string
}) {
  const text = `
✅ <b>Мастер подтвердил запись!</b>

💈 Мастер: ${params.masterName}
📍 Адрес: ${params.masterAddress}
📅 Дата: ${params.bookingDate}
🕐 Время: ${params.startTime}

Ждём вас!
  `.trim()
  
  return sendTelegramMessage({
    chatId: params.clientChatId,
    text,
    parseMode: 'HTML'
  })
}

/**
 * Уведомление клиенту что мастер отклонил заказ
 */
export async function notifyClientOrderRejected(params: {
  clientChatId: number
  masterName: string
  bookingDate: string
  startTime: string
}) {
  const text = `
❌ <b>Мастер отклонил запись</b>

💈 Мастер: ${params.masterName}
📅 Дата: ${params.bookingDate}
🕐 Время: ${params.startTime}

К сожалению, мастер не смог принять ваш заказ.
Попробуйте выбрать другое время или другого мастера.
  `.trim()
  
  return sendTelegramMessage({
    chatId: params.clientChatId,
    text,
    parseMode: 'HTML'
  })
}

/**
 * Напоминание клиенту за 2 часа до записи
 */
export async function notifyClientReminder(params: {
  clientChatId: number
  masterName: string
  masterAddress: string
  startTime: string
}) {
  const text = `
⏰ <b>Напоминание о записи</b>

Через 2 часа у вас запись:

💈 Мастер: ${params.masterName}
📍 Адрес: ${params.masterAddress}
🕐 Время: ${params.startTime}

До встречи!
  `.trim()
  
  return sendTelegramMessage({
    chatId: params.clientChatId,
    text,
    parseMode: 'HTML'
  })
}

/**
 * Проверить доступен ли Telegram Bot API
 */
export async function checkBotConnection() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getMe`
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.ok) {
      console.log('Bot connected:', data.result.username)
      return true
    }
    
    return false
  } catch (error) {
    console.error('Bot connection error:', error)
    return false
  }
}