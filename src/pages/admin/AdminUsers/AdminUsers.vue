<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { getAllUsers, updateUserRole } from "@/api/admin"
import type { UserRole } from "@/shared/auth/role"

const router = useRouter()

type User = {
  id: number
  telegram_id: number
  first_name: string | null
  last_name: string | null
  username: string | null
  phone: string | null
  role: UserRole
  created_at: string
}

const users = ref<User[]>([])
const loading = ref(true)
const searchQuery = ref("")
const roleFilter = ref<UserRole | "all">("all")

const roles: UserRole[] = ["client", "master", "admin"]

// Фильтрация пользователей
const filteredUsers = computed(() => {
  let result = [...users.value]
  
  // Фильтр по роли
  if (roleFilter.value !== "all") {
    result = result.filter(u => u.role === roleFilter.value)
  }
  
  // Поиск по имени, username, telegram_id, phone
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(u => {
      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
      const username = (u.username || '').toLowerCase()
      const telegramId = String(u.telegram_id)
      const phone = (u.phone || '').toLowerCase()
      
      return fullName.includes(query) ||
             username.includes(query) ||
             telegramId.includes(query) ||
             phone.includes(query)
    })
  }
  
  return result
})

async function loadUsers() {
  try {
    loading.value = true
    users.value = await getAllUsers() as User[]
  } catch (error) {
    console.error('Error loading users:', error)
  } finally {
    loading.value = false
  }
}

async function setRole(userId: number, role: UserRole) {
  try {
    await updateUserRole(userId, role)
    
    // Обновляем локально
    const user = users.value.find(u => u.id === userId)
    if (user) {
      user.role = role
    }
  } catch (error) {
    console.error('Error updating role:', error)
    alert('Не удалось обновить роль')
  }
}

function getUserDisplayName(user: User): string {
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim()
  }
  if (user.username) {
    return `@${user.username}`
  }
  return `User ${user.telegram_id}`
}

function goToAddUser() {
  router.push({ name: 'AdminAddUser' })
}

onMounted(() => {
  loadUsers()
})
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold">Пользователи</h1>
      <div class="flex gap-2">
        <button 
          @click="goToAddUser"
          class="px-4 py-2 bg-black text-white rounded-xl text-sm hover:opacity-90 font-medium"
        >
          ➕ Добавить
        </button>
        <button 
          @click="loadUsers"
          class="px-4 py-2 bg-gray-100 rounded-xl text-sm hover:bg-gray-200"
        >
          🔄
        </button>
      </div>
    </div>

    <!-- Поиск и фильтры -->
    <div class="rounded-2xl bg-white p-4 shadow space-y-3">
      <!-- Поиск -->
      <div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск по имени, username, telegram_id, телефону..."
          class="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-black"
        />
      </div>

      <!-- Фильтр по роли -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500">Роль:</span>
        <select
          v-model="roleFilter"
          class="rounded-xl border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="all">Все</option>
          <option value="client">Клиенты</option>
          <option value="master">Мастера</option>
          <option value="admin">Админы</option>
        </select>
      </div>

      <!-- Статистика -->
      <div class="flex gap-4 text-sm text-gray-600">
        <div>Всего: <b>{{ users.length }}</b></div>
        <div>Клиенты: <b>{{ users.filter(u => u.role === 'client').length }}</b></div>
        <div>Мастера: <b>{{ users.filter(u => u.role === 'master').length }}</b></div>
        <div>Админы: <b>{{ users.filter(u => u.role === 'admin').length }}</b></div>
      </div>
    </div>

    <!-- Загрузка -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Загрузка пользователей...</p>
    </div>

    <!-- Пусто -->
    <div v-else-if="filteredUsers.length === 0" class="text-center py-8">
      <p class="text-gray-500">Пользователи не найдены</p>
    </div>

    <!-- Список пользователей -->
    <div v-else class="space-y-3">
      <div 
        v-for="u in filteredUsers" 
        :key="u.id" 
        class="rounded-2xl bg-white p-4 shadow hover:shadow-md transition-shadow"
      >
        <div class="flex items-center gap-3">
          <!-- Аватар -->
          <div class="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
            {{ ((u.first_name || u.username || 'U')[0] || 'U').toUpperCase() }}
          </div>

          <!-- Инфо -->
          <div class="flex-1 min-w-0">
            <div class="font-semibold truncate">{{ getUserDisplayName(u) }}</div>
            <div class="text-xs text-gray-500 space-y-0.5">
              <div>TG ID: {{ u.telegram_id }}</div>
              <div v-if="u.username" class="truncate">@{{ u.username }}</div>
              <div v-if="u.phone">📱 {{ u.phone }}</div>
            </div>
          </div>

          <!-- Роль -->
          <div class="flex-shrink-0">
            <select
              class="rounded-xl border border-gray-200 px-3 py-2 text-sm"
              :value="u.role"
              @change="setRole(u.id, ($event.target as HTMLSelectElement).value as UserRole)"
            >
              <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>