<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

const isActive = (routeName: string) => {
  return computed(() => route.name === routeName)
}
</script>

<template>
  <footer class="client-footer">
    <nav class="footer-nav">
      <!-- Карта -->
      <router-link 
        to="/client" 
        class="nav-item"
        :class="{ active: isActive('ClientHome').value }"
      >
        <div class="nav-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
        <span class="nav-label">Карта</span>
      </router-link>

      <!-- История -->
      <router-link 
        to="/client/history" 
        class="nav-item"
        :class="{ active: isActive('ClientHistory').value }"
      >
        <div class="nav-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <span class="nav-label">История</span>
      </router-link>
    </nav>
  </footer>
</template>

<style scoped>
.client-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1001;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.footer-nav {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  padding: 8px 0;
  max-width: 600px;
  margin: 0 auto;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  text-decoration: none;
  color: #9ca3af;
  transition: all 0.2s ease;
  position: relative;
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  transition: all 0.3s ease;
  background: transparent;
}

.nav-label {
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

/* Active state */
.nav-item.active {
  color: #667eea;
}

.nav-item.active .nav-icon {
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
}

.nav-item.active .nav-icon svg {
  stroke: #667eea;
  stroke-width: 2.5;
}

/* Hover effect */
.nav-item:hover .nav-icon {
  background: #f5f5f5;
  transform: scale(1.05);
}

/* Active indicator */
.nav-item.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 3px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 0 0 4px 4px;
}

/* Responsive */
@media (max-width: 375px) {
  .nav-label {
    font-size: 11px;
  }
  
  .nav-icon {
    width: 36px;
    height: 36px;
  }
}
</style>