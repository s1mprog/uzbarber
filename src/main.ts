import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import './assets/main.css'

// ========================================
// TELEGRAM WEB APP INITIALIZATION
// ========================================

const tg = (window as any).Telegram?.WebApp;

if (tg) {
  console.log('🚀 Initializing Telegram Web App...');
  
  // 1. Разворачиваем приложение на весь экран
  tg.expand();
  
  // 2. Отключаем закрытие при свайпе вниз
  if (tg.disableVerticalSwipes) {
    tg.disableVerticalSwipes();
  }
  
  // 3. Настраиваем цвета
  tg.setHeaderColor('#ffffff');
  tg.setBackgroundColor('#ffffff');
  
  // 4. Скрываем кнопку "Назад" (используем свою навигацию)
  tg.BackButton.hide();
  
  // 5. Следим за изменением viewport и всегда держим expanded
  tg.onEvent('viewportChanged', () => {
    if (!tg.isExpanded) {
      console.log('⚠️ Viewport collapsed, expanding...');
      tg.expand();
    }
  });
  
  // 6. Говорим Telegram что приложение готово
  tg.ready();
  
  console.log('✅ Telegram Web App initialized:');
  console.log('   Platform:', tg.platform);
  console.log('   Version:', tg.version);
  console.log('   Viewport height:', tg.viewportHeight);
  console.log('   Is expanded:', tg.isExpanded);
} else {
  console.log('⚠️ Not running in Telegram Web App');
}

// ========================================
// PREVENT BODY SCROLL
// ========================================

// Убираем pull-to-refresh и overscroll
document.body.style.overscrollBehavior = 'none';
document.documentElement.style.overscrollBehavior = 'none';

// Предотвращаем скролл самого body
document.body.addEventListener('touchmove', (e) => {
  // Разрешаем скролл только внутри #app
  const target = e.target as HTMLElement;
  const app = document.getElementById('app');
  
  if (target === document.body || !app?.contains(target)) {
    e.preventDefault();
  }
}, { passive: false });

// Блокируем bounce на iOS
let lastTouchY = 0;
let preventPullToRefresh = false;

document.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1 || !e.touches[0]) return;
  lastTouchY = e.touches[0].clientY;
  
  // Если скролл в самом верху, блокируем pull-to-refresh
  const app = document.getElementById('app');
  preventPullToRefresh = app ? app.scrollTop === 0 : false;
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (!e.touches[0]) return;
  const touchY = e.touches[0].clientY;
  const touchYDelta = touchY - lastTouchY;
  lastTouchY = touchY;
  
  if (preventPullToRefresh && touchYDelta > 0) {
    e.preventDefault();
    return;
  }
}, { passive: false });

// ========================================
// CREATE VUE APP
// ========================================

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

console.log('✅ Vue app mounted');