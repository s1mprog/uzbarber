import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router"

import Home from "@/pages/Home/Home.vue"

import ClientLayout from "@/pages/client/ClientLayout.vue"
import MasterLayout from "@/pages/master/MasterLayout.vue"

import ClientMap from "@/pages/client/ClientMap/ClientMap.vue"
import ClientMaster from "@/pages/client/ClientMaster/ClientMaster.vue"
import ClientTime from "@/pages/client/ClientTime/ClientTime.vue"
import ClientCheckout from "@/pages/client/ClientCheckout/ClientCheckout.vue"
import ClientStatus from "@/pages/client/ClientStatus/ClientStatus.vue"

import MasterHome from "@/pages/master/MasterHome/MasterHome.vue"

import AdminLayout from "@/pages/admin/AdminLayout.vue"

import { getUserRole, initUserRole, type UserRole } from "@/shared/auth/role"

declare module "vue-router" {
  interface RouteMeta {
    role?: UserRole
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: () => {
      const role = getUserRole()
      if (role === "admin") return "/admin"
      return role === "master" ? "/master" : "/client"
    }
  },

  {
    path: "/home",
    name: "Home",
    component: Home
  },

  // CLIENT FLOW
  {
    path: "/client",
    component: ClientLayout,
    meta: { role: "client" },
    children: [
      { path: "", name: "ClientMap", component: ClientMap },
      { path: "history", name: "ClientHistory", component: () => import("@/pages/client/ClientHistory/ClientHistory.vue") },
      { path: "master/:id", name: "ClientMaster", component: ClientMaster },
      { path: "master/:id/time", name: "ClientTime", component: ClientTime },
      { path: "contact", name: "ClientContact", component: () => import("@/pages/client/ClientContact/ClientContact.vue") },
      { path: "checkout", name: "ClientCheckout", component: ClientCheckout },
      { path: "status/:bookingId", name: "ClientStatus", component: ClientStatus }
    ]
  },

  // MASTER
  {
    path: "/master",
    component: MasterLayout,
    meta: { role: "master" },
    children: [
      { path: "", redirect: { name: "MasterToday" } },
      { path: "calendar", name: "MasterCalendar", component: () => import("@/pages/master/MasterCalendar/MasterCalendar.vue") },
      { path: "today", name: "MasterToday", component: () => import("@/pages/master/MasterToday/MasterToday.vue") },
      { path: "profile", name: "MasterProfile", component: () => import("@/pages/master/MasterProfile/MasterProfile.vue") }
    ]
  },

  // ADMIN
  {
    path: "/admin",
    component: AdminLayout,
    meta: { role: "admin" },
    children: [
      { path: "", redirect: { name: "AdminUsers" } },
      { path: "users", name: "AdminUsers", component: () => import("@/pages/admin/AdminUsers/AdminUsers.vue") },
      { path: "orders", name: "AdminOrders", component: () => import("@/pages/admin/AdminOrders/AdminOrders.vue") },
      { path: "add-user", name: "AdminAddUser", component: () => import("@/pages/admin/AdminAddUser/AdminAddUser.vue") }
    ]
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Флаг инициализации
let roleInitialized = false

router.beforeEach(async (to, from, next) => {
  // Инициализируем роль один раз при первой навигации
  if (!roleInitialized) {
    console.log('Initializing user role...')
    await initUserRole()
    roleInitialized = true
  }

  const role = getUserRole()
  const needRole = to.meta.role

  console.log('Navigation:', { to: to.path, role, needRole })

  if (!needRole) {
    next()
    return
  }

  if (needRole !== role) {
    console.log('Role mismatch, redirecting...')
    if (role === "admin") {
      next("/admin")
    } else if (role === "master") {
      next("/master")
    } else {
      next("/client")
    }
    return
  }

  next()
})

export default router