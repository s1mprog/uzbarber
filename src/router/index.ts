import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import Home from '@/pages/Home/Home.vue'

import ClientLayout from '@/pages/client/ClientLayout.vue'
import ClientHome from '@/pages/client/ClientHome/ClientHome.vue'

import MasterLayout from '@/pages/master/MasterLayout.vue'
import MasterHome from '@/pages/master/MasterHome/MasterHome.vue'


const getUserRole = (): 'client' | 'master' => {
  
  // const initData = window.Telegram?.WebApp?.initData

  const initData = 'user={"id":1234567893}'

  if (initData) {
    const userId = JSON.parse(new URLSearchParams(initData).get('user') || '{}').id
    const masterIds = [123456789, 987654321]  
    return masterIds.includes(userId) ? 'master' : 'client'
  }
  return 'client'
}


const routes: RouteRecordRaw[] = [
    {
      path: '/',
      name: 'Home',
      component: Home,
      beforeEnter: (to, from, next) => {
        const role = getUserRole()
        next(role === 'master' ? '/master' : '/client')
      }
      
    },
    {
      path: '/client',
      name: 'ClientLayout',
      component: ClientLayout,
      children: [
        {
          path: '',
          name: 'ClientHome',
          component: ClientHome
        }        
      ]
    },
    {
      path: '/master',
      name: 'MasterLayout',
      component: MasterLayout,
      children: [
        {
          path: '',
          name: 'MasterHome',
          component: MasterHome
        }
      ]
    }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
