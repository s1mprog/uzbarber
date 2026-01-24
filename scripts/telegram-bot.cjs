// scripts/telegram-bot.js
// Простой локальный бот для получения chat_id пользователей
// Запускать: node scripts/telegram-bot.js

const https = require('https')

const BOT_TOKEN = '8250270326:AAFK4N4v4gqCOpyBuswugFxbnMjpjXoEgxU'
const SUPABASE_URL = 'https://iyakdaqvdvgvkqzygfih.supabase.co'
const SUPABASE_KEY = 'sb_publishable_nrN-i-t0VECiiSp00N9VgQ_dJA7b6Pr '

let offset = 0

async function getUpdates() {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}`
    
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

async function sendMessage(chatId, text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    })
    
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }
    
    const req = https.request(options, (res) => {
      let responseData = ''
      res.on('data', chunk => responseData += chunk)
      res.on('end', () => resolve(JSON.parse(responseData)))
    })
    
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function updateChatId(telegramId, chatId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      telegram_chat_id: chatId
    })
    
    const options = {
      hostname: SUPABASE_URL.replace('https://', ''),
      path: `/rest/v1/users?telegram_id=eq.${telegramId}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      }
    }
    
    const req = https.request(options, (res) => {
      let responseData = ''
      res.on('data', chunk => responseData += chunk)
      res.on('end', () => {
        console.log(`✅ Chat ID saved for user ${telegramId}`)
        resolve()
      })
    })
    
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function processUpdate(update) {
  if (update.message && update.message.text === '/start') {
    const chatId = update.message.chat.id
    const userId = update.message.from.id
    const firstName = update.message.from.first_name || ''
    
    console.log(`📱 User ${firstName} (${userId}) started bot`)
    
    try {
      // Сохраняем chat_id в базу
      await updateChatId(userId, chatId)
      
      // Отправляем приветственное сообщение
      await sendMessage(chatId, `
🎉 <b>Добро пожаловать в UzBarber!</b>

Теперь вы будете получать уведомления о:
✅ Подтверждении записи
❌ Отмене записи
⏰ Напоминания за 2 часа до визита

Чтобы записаться к барберу, откройте приложение UzBarber.
      `.trim())
      
      console.log(`✅ Welcome message sent to ${firstName}`)
      
    } catch (error) {
      console.error('❌ Error:', error.message)
    }
  }
}

async function poll() {
  try {
    const response = await getUpdates()
    
    if (response.ok && response.result.length > 0) {
      for (const update of response.result) {
        await processUpdate(update)
        offset = update.update_id + 1
      }
    }
    
  } catch (error) {
    console.error('Poll error:', error.message)
  }
  
  // Опрашиваем каждые 2 секунды
  setTimeout(poll, 2000)
}

console.log('🤖 Bot started...')
console.log('📱 Waiting for /start commands...')
poll()