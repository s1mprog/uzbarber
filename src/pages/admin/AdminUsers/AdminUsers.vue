<script setup lang="ts">
import { computed } from "vue"
import { useUsersStore } from "@/stores/users"
import type { UserRole } from "@/shared/auth/role"

const usersStore = useUsersStore()
const users = computed(() => usersStore.users)

const roles: UserRole[] = ["client", "master", "admin"]

function setRole(id: number, role: UserRole) {
  usersStore.setRole(id, role)
}
</script>

<template>
  <div class="p-4 space-y-3">
    <h1 class="text-xl font-bold">Users</h1>
    <p class="text-sm text-gray-500">telegram_id / name / photo / role</p>

    <div v-for="u in users" :key="u.telegram_id" class="rounded-2xl bg-white p-4 shadow space-y-2">
      <div class="flex items-center gap-3">
        <div class="h-12 w-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
          <img v-if="u.photo" :src="u.photo" class="h-full w-full object-cover" />
          <span v-else class="text-xs text-gray-500">no</span>
        </div>

        <div class="flex-1">
          <div class="font-semibold">{{ u.name }}</div>
          <div class="text-xs text-gray-500">telegram_id: {{ u.telegram_id }}</div>
        </div>

        <select
          class="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          :value="u.role"
          @change="setRole(u.telegram_id, ($event.target as HTMLSelectElement).value as UserRole)"
        >
          <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
        </select>
      </div>
    </div>
  </div>
</template>
