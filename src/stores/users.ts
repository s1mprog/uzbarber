import { defineStore } from "pinia"
import type { UserRole } from "@/shared/auth/role"

export type AppUser = {
  telegram_id: number
  name: string
  photo?: string
  role: UserRole
}

const LS_KEY = "ADMIN_USERS_V1"

const MOCK_USERS: AppUser[] = [
  { telegram_id: 123456789, name: "Master Ivan", role: "master", photo: "" },
  { telegram_id: 222222222, name: "Client Aziz", role: "client", photo: "" },
  { telegram_id: 111111111, name: "Admin", role: "admin", photo: "" }
]

function load(): AppUser[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return MOCK_USERS
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return MOCK_USERS
  } catch {
    return MOCK_USERS
  }
}

function save(data: AppUser[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

export const useUsersStore = defineStore("users", {
  state: () => ({
    users: load() as AppUser[]
  }),

  actions: {
    setRole(telegram_id: number, role: UserRole) {
      const u = this.users.find((x) => x.telegram_id === telegram_id)
      if (!u) return
      u.role = role
      save(this.users)
    },

    upsertUser(user: AppUser) {
      const idx = this.users.findIndex((x) => x.telegram_id === user.telegram_id)
      if (idx === -1) this.users.unshift(user)
      else this.users[idx] = { ...this.users[idx], ...user }
      save(this.users)
    }
  }
})
