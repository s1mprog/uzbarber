<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { getMasterProfileByTelegramId, updateMasterProfile, updateUserPhone } from "@/api/master"
import { getTelegramUser } from "@/shared/auth/role"

type MasterProfile = {
  id: number
  userId: number
  photoUrl: string | null
  name: string
  phone: string | null
  username: string | null
  bio: string | null
  price30min: number
  price60min: number
  address: string
}

const profile = ref<MasterProfile | null>(null)
const loading = ref(true)
const error = ref("")

// edit state
const isEditing = ref(false)
const draft = ref<Partial<MasterProfile>>({})
const saving = ref(false)

const errors = ref<{ name?: string; price30?: string; price60?: string }>({})

// ---- Load profile
async function loadProfile() {
  try {
    loading.value = true
    error.value = ""
    
    const tgUser = getTelegramUser()
    if (!tgUser?.id) {
      error.value = "Telegram user not found"
      return
    }
    
    const data = await getMasterProfileByTelegramId(tgUser.id)
    
    profile.value = {
      id: data.id,
      userId: data.userId,
      photoUrl: data.photoUrl,
      name: data.name,
      phone: data.phone,
      username: data.username,
      bio: data.bio,
      price30min: data.price30min,
      price60min: data.price60min,
      address: data.address
    }
    
  } catch (err: any) {
    console.error('Error loading profile:', err)
    error.value = 'Не удалось загрузить профиль'
  } finally {
    loading.value = false
  }
}

function startEdit() {
  if (!profile.value) return
  
  errors.value = {}
  draft.value = { ...profile.value }
  isEditing.value = true
}

function cancelEdit() {
  errors.value = {}
  draft.value = {}
  isEditing.value = false
}

function validate() {
  errors.value = {}

  if (!draft.value.name?.trim()) {
    errors.value.name = "Введите название"
  }

  if (!draft.value.price30min || draft.value.price30min <= 0) {
    errors.value.price30 = "Цена должна быть больше 0"
  }

  if (!draft.value.price60min || draft.value.price60min <= 0) {
    errors.value.price60 = "Цена должна быть больше 0"
  }

  return Object.keys(errors.value).length === 0
}

async function saveEdit() {
  if (!validate() || !profile.value) return

  try {
    saving.value = true
    error.value = ""
    
    // Обновляем профиль мастера
    await updateMasterProfile(profile.value.userId, {
      name: draft.value.name?.trim(),
      bio: draft.value.bio?.trim() || undefined,
      photoUrl: draft.value.photoUrl?.trim() || undefined,
      price30min: draft.value.price30min,
      price60min: draft.value.price60min
    })
    
    // Обновляем телефон в users (если изменился)
    if (draft.value.phone && draft.value.phone !== profile.value.phone) {
      await updateUserPhone(profile.value.userId, draft.value.phone.trim())
    }
    
    // Обновляем локальное состояние
    profile.value = { ...profile.value, ...draft.value } as MasterProfile
    
    isEditing.value = false
    
  } catch (err: any) {
    console.error('Error saving profile:', err)
    error.value = 'Не удалось сохранить изменения'
  } finally {
    saving.value = false
  }
}

// file -> dataURL
function readFileAsDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

async function onPickPhoto(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // небольшая защита: только картинки
  if (!file.type.startsWith("image/")) return

  const dataUrl = await readFileAsDataURL(file)
  draft.value.photoUrl = dataUrl
}

const hasPhoto = computed(() => {
  const url = isEditing.value ? draft.value.photoUrl : profile.value?.photoUrl
  return !!url
})

const displayUsername = computed(() => {
  const username = isEditing.value ? draft.value.username : profile.value?.username
  return username ? `@${username}` : "—"
})

onMounted(() => {
  loadProfile()
})
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold">Профиль</h1>

      <button
        v-if="!isEditing && profile"
        type="button"
        class="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-95"
        @click="startEdit"
      >
        Изменить
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="rounded-2xl bg-red-50 p-4 text-red-600 text-sm">
      {{ error }}
      <button @click="loadProfile" class="ml-2 underline">Попробовать снова</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Загрузка профиля...</p>
    </div>

    <!-- VIEW MODE -->
    <div v-else-if="!isEditing && profile" class="rounded-2xl bg-white p-4 shadow space-y-3">
      <div class="flex items-center gap-3">
        <div class="h-16 w-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
          <img
            v-if="profile.photoUrl"
            :src="profile.photoUrl"
            class="h-full w-full object-cover"
            alt="photo"
          />
          <span v-else class="text-2xl">💈</span>
        </div>

        <div>
          <div class="font-semibold text-lg">{{ profile.name }}</div>
          <div class="text-sm text-gray-500">{{ profile.phone || "—" }}</div>
        </div>
      </div>

      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500">Telegram:</span>
          <span>{{ displayUsername }}</span>
        </div>
        
        <div class="flex justify-between">
          <span class="text-gray-500">Адрес:</span>
          <span class="text-right">{{ profile.address }}</span>
        </div>
        
        <div v-if="profile.bio" class="pt-2 border-t">
          <div class="text-gray-500 mb-1">О себе:</div>
          <div>{{ profile.bio }}</div>
        </div>
        
        <div class="pt-2 border-t">
          <div class="text-gray-500 mb-2">Цены:</div>
          <div class="flex justify-between">
            <span>30 минут:</span>
            <span class="font-medium">{{ profile.price30min.toLocaleString() }} сум</span>
          </div>
          <div class="flex justify-between mt-1">
            <span>60 минут:</span>
            <span class="font-medium">{{ profile.price60min.toLocaleString() }} сум</span>
          </div>
        </div>
      </div>
    </div>

    <!-- EDIT MODE -->
    <div v-else-if="isEditing" class="rounded-2xl bg-white p-4 shadow space-y-4">
      <div class="flex items-center gap-3">
        <div class="h-16 w-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
          <img
            v-if="draft.photoUrl"
            :src="draft.photoUrl"
            class="h-full w-full object-cover"
            alt="photo"
          />
          <span v-else class="text-2xl">💈</span>
        </div>

        <div class="flex-1">
          <label class="text-sm text-gray-600 block mb-1">Фото</label>
          <input
            type="file"
            accept="image/*"
            class="block w-full text-sm"
            @change="onPickPhoto"
          />
          <p class="text-xs text-gray-500 mt-1">Можно загрузить фото или вставить URL</p>
        </div>
      </div>

      <!-- Photo URL -->
      <div>
        <label class="text-sm text-gray-600">URL фото (или загрузите выше)</label>
        <input
          v-model="draft.photoUrl"
          type="text"
          class="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-black"
          placeholder="https://example.com/photo.jpg"
        />
      </div>

      <!-- Name -->
      <div>
        <label class="text-sm text-gray-600">Название барбершопа *</label>
        <input
          v-model="draft.name"
          type="text"
          class="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-black"
          placeholder="Барбершоп на Навои"
        />
        <div v-if="errors.name" class="mt-1 text-xs text-red-600">{{ errors.name }}</div>
      </div>

      <!-- Phone -->
      <div>
        <label class="text-sm text-gray-600">Телефон</label>
        <input
          v-model="draft.phone"
          type="tel"
          class="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-black"
          placeholder="+998 90 123 45 67"
        />
      </div>

      <!-- Bio -->
      <div>
        <label class="text-sm text-gray-600">О себе</label>
        <textarea
          v-model="draft.bio"
          rows="3"
          class="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-black"
          placeholder="Барбер с опытом 5 лет. Фейды, классика, борода."
        />
      </div>

      <!-- Prices -->
      <div class="space-y-3">
        <label class="text-sm text-gray-600 block">Цены</label>
        
        <div>
          <label class="text-xs text-gray-500">30 минут *</label>
          <div class="relative">
            <input
              v-model.number="draft.price30min"
              type="number"
              min="1"
              step="1000"
              class="mt-1 w-full rounded-xl border border-gray-200 p-3 pr-16 outline-none focus:border-black"
              placeholder="50000"
            />
            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">сум</span>
          </div>
          <div v-if="errors.price30" class="mt-1 text-xs text-red-600">{{ errors.price30 }}</div>
        </div>

        <div>
          <label class="text-xs text-gray-500">60 минут *</label>
          <div class="relative">
            <input
              v-model.number="draft.price60min"
              type="number"
              min="1"
              step="1000"
              class="mt-1 w-full rounded-xl border border-gray-200 p-3 pr-16 outline-none focus:border-black"
              placeholder="100000"
            />
            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">сум</span>
          </div>
          <div v-if="errors.price60" class="mt-1 text-xs text-red-600">{{ errors.price60 }}</div>
        </div>
      </div>

      <!-- Buttons -->
      <div class="grid grid-cols-2 gap-2 pt-2">
        <button
          type="button"
          class="rounded-xl bg-black p-3 text-white hover:opacity-95 disabled:opacity-50"
          :disabled="saving"
          @click="saveEdit"
        >
          <span v-if="saving">Сохранение...</span>
          <span v-else>Сохранить</span>
        </button>
        <button
          type="button"
          class="rounded-xl bg-gray-200 p-3 text-gray-900 hover:opacity-95"
          :disabled="saving"
          @click="cancelEdit"
        >
          Отмена
        </button>
      </div>
    </div>
  </div>
</template>