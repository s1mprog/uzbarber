import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import './assets/main.css'

// ========================================
// DEV: SIMPLE MOCK TELEGRAM API
// ========================================

// 🎯 Просто измените telegram_id на нужный для тестирования:
const DEV_USER_ID = 78703096911  // ← ИЗМЕНИТЕ ЗДЕСЬ

// Проверяем есть ли реальный Telegram API
const hasTelegramWebApp = !!(window as any).Telegram?.WebApp
const hasTelegramUser = !!(window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id
  
console.log('🔍 Telegram detection:')
console.log('   Has Telegram.WebApp:', hasTelegramWebApp)
console.log('   Has user data:', hasTelegramUser)

// Создаём мок только если:
// 1. Мы в dev режиме
// 2. И нет реального Telegram API с данными пользователя
if (import.meta.env.DEV && !hasTelegramUser) {
  console.log('🔧 DEV MODE: Creating mock Telegram API')
  console.log('👤 Mock User ID:', DEV_USER_ID)
  
  // Если есть Telegram.WebApp но нет пользователя - дополняем данные
  if (hasTelegramWebApp) {
    console.log('⚠️ Telegram WebApp exists but no user data - injecting mock user')
    const tg = (window as any).Telegram.WebApp
    
    if (!tg.initDataUnsafe) {
      tg.initDataUnsafe = {}
    }
    
    tg.initDataUnsafe.user = {
      id: DEV_USER_ID,
      first_name: 'Dev',
      last_name: 'User',
      username: `user${DEV_USER_ID}`,
      language_code: 'ru',
      is_premium: false,
      allows_write_to_pm: true
    }
    
    tg.initDataUnsafe.chat_instance = '123456789'
    tg.initDataUnsafe.chat_type = 'sender'
    tg.initDataUnsafe.auth_date = Math.floor(Date.now() / 1000)
    tg.initDataUnsafe.hash = 'mock_hash'
    
    // НЕ трогаем initData - это read-only свойство
    
    console.log('✅ Mock user data injected into existing Telegram WebApp')
  } else {
    // Создаём полный мок с нуля
    console.log('🔧 Creating full Telegram WebApp mock')
    
    ;(window as any).Telegram = {
      WebApp: {
        initData: `user=${encodeURIComponent(JSON.stringify({id: DEV_USER_ID}))}`,
        initDataUnsafe: {
          user: {
            id: DEV_USER_ID,
            first_name: 'Dev',
            last_name: 'User',
            username: `user${DEV_USER_ID}`,
            language_code: 'ru'
          },
          chat_instance: '123456789',
          chat_type: 'sender',
          auth_date: Math.floor(Date.now() / 1000),
          hash: 'mock_hash'
        },
        version: '7.0',
        platform: 'web',
        colorScheme: 'light',
        viewportHeight: window.innerHeight,
        viewportStableHeight: window.innerHeight,
        isExpanded: true,
        ready: () => console.log('📱 Mock: ready()'),
        expand: () => console.log('📱 Mock: expand()'),
        close: () => console.log('📱 Mock: close()'),
        enableVerticalSwipes: () => {},
        disableVerticalSwipes: () => {},
        setHeaderColor: () => {},
        setBackgroundColor: () => {},
        onEvent: () => {},
        offEvent: () => {},
        MainButton: { isVisible: false, show: () => {}, hide: () => {}, onClick: () => {}, setText: () => {} },
        BackButton: { isVisible: false, show: () => {}, hide: () => {}, onClick: () => {} },
        HapticFeedback: { impactOccurred: () => {}, notificationOccurred: () => {}, selectionChanged: () => {} }
      }
    }
    
    console.log('✅ Full Telegram WebApp mock created')
  }
}

// ========================================
// TELEGRAM WEB APP INITIALIZATION
// ========================================

const tg = (window as any).Telegram?.WebApp

if (tg) {
  console.log('🚀 Initializing Telegram Web App...')
  
  // 1. Разворачиваем приложение на весь экран
  if (typeof tg.expand === 'function') {
    tg.expand()
  }
  
  // 2. Отключаем закрытие при свайпе вниз
  if (typeof tg.disableVerticalSwipes === 'function') {
    tg.disableVerticalSwipes()
  }
  
  // 3. Настраиваем цвета
  if (typeof tg.setHeaderColor === 'function') {
    tg.setHeaderColor('#ffffff')
  }
  if (typeof tg.setBackgroundColor === 'function') {
    tg.setBackgroundColor('#ffffff')
  }
  
  // 4. Скрываем кнопку "Назад"
  if (tg.BackButton && typeof tg.BackButton.hide === 'function') {
    tg.BackButton.hide()
  }
  
  // 5. Следим за изменением viewport
  if (typeof tg.onEvent === 'function') {
    tg.onEvent('viewportChanged', () => {
      if (!tg.isExpanded && typeof tg.expand === 'function') {
        console.log('⚠️ Viewport collapsed, expanding...')
        tg.expand()
      }
    })
  }
  
  // 6. Говорим Telegram что готовы
  if (typeof tg.ready === 'function') {
    tg.ready()
  }
  
  console.log('✅ Telegram Web App initialized:')
  console.log('   User ID:', tg.initDataUnsafe?.user?.id)
  console.log('   User name:', tg.initDataUnsafe?.user?.first_name)
  console.log('   Platform:', tg.platform)
  console.log('   Version:', tg.version)
  console.log('   Is expanded:', tg.isExpanded)
  
  // ⚠️ Предупреждение если нет данных пользователя
  if (!tg.initDataUnsafe?.user?.id) {
    console.error('⚠️ WARNING: Telegram user ID not found!')
    console.error('   This might cause authentication issues.')
    console.error('   Make sure the app is opened through Telegram bot.')
  }
}

// ========================================
// PREVENT BODY SCROLL
// ========================================

document.body.style.overscrollBehavior = 'none'
document.documentElement.style.overscrollBehavior = 'none'

document.body.addEventListener('touchmove', (e) => {
  const target = e.target as HTMLElement
  const app = document.getElementById('app')
  
  if (target === document.body || !app?.contains(target)) {
    e.preventDefault()
  }
}, { passive: false })

let lastTouchY = 0
let preventPullToRefresh = false

document.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1 || !e.touches[0]) return
  lastTouchY = e.touches[0].clientY
  
  const app = document.getElementById('app')
  preventPullToRefresh = app ? app.scrollTop === 0 : false
}, { passive: false })

document.addEventListener('touchmove', (e) => {
  if (!e.touches[0]) return
  const touchY = e.touches[0].clientY
  const touchYDelta = touchY - lastTouchY
  lastTouchY = touchY
  
  if (preventPullToRefresh && touchYDelta > 0) {
    e.preventDefault()
    return
  }
}, { passive: false })

// ========================================
// CREATE VUE APP
// ========================================

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

console.log('✅ Vue app mounted')