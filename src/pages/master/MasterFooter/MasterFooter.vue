<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"

const route = useRoute()

const items = [
  { name: "MasterCalendar", label: "Календарь", to: "/master/calendar", key: "calendar" },
  { name: "MasterToday", label: "Сегодня", to: "/master/today", key: "today" },
  { name: "MasterProfile", label: "Профиль", to: "/master/profile", key: "profile" }
]

const activeKey = computed(() => {
  // Если у тебя будут вложенные страницы внутри /master/today/...
  // активность всё равно будет работать
  const path = String(route.path || "")
  if (path.startsWith("/master/calendar")) return "calendar"
  if (path.startsWith("/master/profile")) return "profile"
  return "today"
})
</script>

<template>
  <footer class="master-footer">
    <nav class="footer-nav">
      <router-link
        v-for="it in items"
        :key="it.key"
        :to="it.to"
        class="nav-item"
        :class="{ active: activeKey === it.key }"
      >
        <div class="nav-icon">
          <!-- Calendar -->
          <svg v-if="it.key === 'calendar'" class="ic" viewBox="0 0 24 24" fill="none">
            <path d="M7 3v3M17 3v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path
              d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </svg>

          <!-- Today -->
          <svg v-else-if="it.key === 'today'" class="ic" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="M12 7v5l3 2"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <!-- Profile -->
          <svg v-else class="ic" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 21a8 8 0 1 0-16 0"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </div>

        <span class="nav-label">{{ it.label }}</span>
      </router-link>
    </nav>
  </footer>
</template>

<style scoped>
.master-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1001;

  background: rgba(255, 255, 255, 0.92);
  border-top: 1px solid rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);

  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.08);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.footer-nav {
  max-width: 720px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 8px 10px;
  gap: 6px;
}

.nav-item {
  text-decoration: none;
  color: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  gap: 4px;
  padding: 8px 8px;
  border-radius: 16px;
  position: relative;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.nav-icon {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid rgba(15, 23, 42, 0.06);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.ic {
  width: 22px;
  height: 22px;
  color: rgba(15, 23, 42, 0.45);
}

.nav-label {
  font-size: 12px;
  font-weight: 800;
}

.nav-item.active {
  color: #667eea;
}

.nav-item.active .nav-icon {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.10), rgba(118, 75, 162, 0.10));
  border-color: rgba(102, 126, 234, 0.16);
}

.nav-item.active .ic {
  color: #667eea;
}

/* Верхняя полоска активной вкладки */
.nav-item.active::before {
  content: "";
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 34px;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.nav-item:active {
  transform: scale(0.98);
}

@media (max-width: 375px) {
  .nav-icon {
    width: 40px;
    height: 40px;
  }
  .nav-label {
    font-size: 11px;
  }
}
</style>
