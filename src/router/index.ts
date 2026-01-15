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


import { getUserRole, type UserRole } from "@/shared/auth/role"

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
      // 1) карта
      { path: "", name: "ClientMap", component: ClientMap },

      // 2) профиль мастера + календарь
      { path: "master/:id", name: "ClientMaster", component: ClientMaster },

      // 3) выбор времени
      { path: "master/:id/time", name: "ClientTime", component: ClientTime },

      { path: "contact", name: "ClientContact", component: () => import("@/pages/client/ClientContact/ClientContact.vue") },

      // 4) checkout + оплата
      { path: "checkout", name: "ClientCheckout", component: ClientCheckout },

      // 5) статус заявки
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
      { path: "orders", name: "AdminOrders", component: () => import("@/pages/admin/AdminOrders/AdminOrders.vue") }
    ]
  },

]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to) => {
  const role = getUserRole()
  const needRole = to.meta.role
  if (!needRole) return true

  if (needRole !== role) {
    if (role === "admin") return "/admin"
    return role === "master" ? "/master" : "/client"
  }
  return true
})

export default router
