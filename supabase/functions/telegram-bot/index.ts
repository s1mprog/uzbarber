// supabase/functions/telegram-bot/index.ts
// Webhook для Telegram бота - сохраняет chat_id пользователей

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  try {
    const update = await req.json()
    
    console.log('Telegram update:', update)
    
    // Обработка команды /start
    if (update.message?.text === '/start') {
      const chatId = update.message.chat.id
      const userId = update.message.from.id
      const firstName = update.message.from.first_name
      const lastName = update.message.from.last_name
      const username = update.message.from.username
      
      console.log('User started bot:', { userId, chatId, username })
      
      // Сохраняем chat_id в базу
      const { error } = await supabase
        .from('users')
        .update({ telegram_chat_id: chatId })
        .eq('telegram_id', userId)
      
      if (error) {
        console.error('Error updating chat_id:', error)
      } else {
        console.log('Chat ID saved for user:', userId)
      }
      
      // Отправляем приветственное сообщение
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
      const welcomeText = `
🎉 Добро пожаловать в UzBarber!

Теперь вы будете получать уведомления о:
✅ Подтверждении записи
❌ Отмене записи  
⏰ Напоминания за 2 часа до визита

Чтобы записаться к барберу, откройте приложение: [ссылка на Mini App]
      `.trim()
      
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeText,
          parse_mode: 'HTML'
        })
      })
    }
    
    return new Response('OK', { status: 200 })
    
  } catch (error) {
    console.error('Error processing update:', error)
    return new Response('Error', { status: 500 })
  }
})