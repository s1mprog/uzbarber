<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import { createUser, createMaster } from "@/api/admin"

const router = useRouter()

const userType = ref<"master" | "admin">("master")
const loading = ref(false)
const error = ref("")
const success = ref("")

// Общие поля
const telegramId = ref("")
const firstName = ref("")
const lastName = ref("")
const username = ref("")
const phone = ref("")

// Поля для мастера
const masterName = ref("")
const bio = ref("")
const photoUrl = ref("")
const address = ref("")
const lat = ref("")
const lng = ref("")
const price30min = ref(50000)
const price60min = ref(100000)

// Валидация
const errors = ref({
  telegramId: "",
  firstName: "",
  phone: "",
  masterName: "",
  address: "",
  location: ""
})

function validateForm(): boolean {
  errors.value = {
    telegramId: "",
    firstName: "",
    phone: "",
    masterName: "",
    address: "",
    location: ""
  }
  
  let isValid = true
  
  // Telegram ID обязателен
  if (!telegramId.value.trim() || !Number.isFinite(Number(telegramId.value))) {
    errors.value.telegramId = "Введите корректный Telegram ID (только цифры)"
    isValid = false
  }
  
  // Имя обязательно
  if (!firstName.value.trim()) {
    errors.value.firstName = "Введите имя"
    isValid = false
  }
  
  // Телефон обязателен
  if (!phone.value.trim()) {
    errors.value.phone = "Введите телефон"
    isValid = false
  }
  
  // Дополнительные проверки для мастера
  if (userType.value === "master") {
    if (!masterName.value.trim()) {
      errors.value.masterName = "Введите название для барбершопа"
      isValid = false
    }
    
    if (!address.value.trim()) {
      errors.value.address = "Введите адрес"
      isValid = false
    }
    
    if (!lat.value || !lng.value) {
      errors.value.location = "Укажите координаты"
      isValid = false
    }
  }
  
  return isValid
}

async function handleSubmit() {
  if (!validateForm()) return
  
  try {
    loading.value = true
    error.value = ""
    success.value = ""
    
    if (userType.value === "admin") {
      // Создаём админа
      await createUser({
        telegramId: Number(telegramId.value),
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim() || undefined,
        username: username.value.trim() || undefined,
        phone: phone.value.trim(),
        role: "admin"
      })
      
      success.value = "Администратор успешно создан!"
    } else {
      // Создаём мастера
      await createMaster({
        telegramId: Number(telegramId.value),
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim() || undefined,
        username: username.value.trim() || undefined,
        phone: phone.value.trim(),
        name: masterName.value.trim(),
        bio: bio.value.trim() || undefined,
        photoUrl: photoUrl.value.trim() || undefined,
        address: address.value.trim(),
        lat: Number(lat.value),
        lng: Number(lng.value),
        price30min: price30min.value,
        price60min: price60min.value
      })
      
      success.value = "Мастер успешно создан!"
    }
    
    // Очищаем форму
    setTimeout(() => {
      router.push({ name: "AdminUsers" })
    }, 2000)
    
  } catch (err: any) {
    console.error('Error creating user:', err)
    
    // Проверяем на дубликат telegram_id
    if (err.code === '23505') {
      error.value = 'Пользователь с таким Telegram ID уже существует'
    } else {
      error.value = err.message || 'Не удалось создать пользователя'
    }
  } finally {
    loading.value = false
  }
}

function getCurrentLocation() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        lat.value = position.coords.latitude.toFixed(6)
        lng.value = position.coords.longitude.toFixed(6)
      },
      (err) => {
        console.error('Error getting location:', err)
        alert('Не удалось получить геолокацию')
      }
    )
  } else {
    alert('Геолокация не поддерживается браузером')
  }
}

function resetForm() {
  telegramId.value = ""
  firstName.value = ""
  lastName.value = ""
  username.value = ""
  phone.value = ""
  masterName.value = ""
  bio.value = ""
  photoUrl.value = ""
  address.value = ""
  lat.value = ""
  lng.value = ""
  price30min.value = 50000
  price60min.value = 100000
  error.value = ""
  success.value = ""
  errors.value = {
    telegramId: "",
    firstName: "",
    phone: "",
    masterName: "",
    address: "",
    location: ""
  }
}
</script>

<template>
  <div class="p-4 space-y-4 max-w-2xl mx-auto">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Добавить пользователя</h1>
      <button 
        @click="router.push({ name: 'AdminUsers' })"
        class="px-4 py-2 text-gray-600 hover:text-black"
      >
        ← Назад
      </button>
    </div>

    <!-- Выбор типа -->
    <div class="rounded-2xl bg-white p-4 shadow">
      <label class="block text-sm font-medium mb-2">Тип пользователя</label>
      <div class="grid grid-cols-2 gap-2">
        <button
          @click="userType = 'master'; resetForm()"
          class="p-4 rounded-xl border-2 transition-all"
          :class="userType === 'master' 
            ? 'border-black bg-black text-white' 
            : 'border-gray-200 hover:border-gray-300'"
        >
          <div class="text-2xl mb-1">💈</div>
          <div class="font-medium">Мастер</div>
        </button>
        <button
          @click="userType = 'admin'; resetForm()"
          class="p-4 rounded-xl border-2 transition-all"
          :class="userType === 'admin' 
            ? 'border-black bg-black text-white' 
            : 'border-gray-200 hover:border-gray-300'"
        >
          <div class="text-2xl mb-1">👑</div>
          <div class="font-medium">Администратор</div>
        </button>
      </div>
    </div>

    <!-- Уведомления -->
    <div v-if="error" class="rounded-2xl bg-red-50 p-4 text-red-600 text-sm">
      {{ error }}
    </div>
    <div v-if="success" class="rounded-2xl bg-green-50 p-4 text-green-600 text-sm">
      {{ success }}
    </div>

    <!-- Форма -->
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Общие поля -->
      <div class="rounded-2xl bg-white p-4 shadow space-y-4">
        <h2 class="font-semibold text-lg">Основная информация</h2>

        <!-- Telegram ID -->
        <div>
          <label class="block text-sm font-medium mb-1">Telegram ID *</label>
          <input
            v-model="telegramId"
            type="text"
            placeholder="123456789"
            class="w-full rounded-xl border px-4 py-2 outline-none focus:border-black"
            :class="errors.telegramId ? 'border-red-500' : 'border-gray-200'"
          />
          <p v-if="errors.telegramId" class="text-xs text-red-500 mt-1">{{ errors.telegramId }}</p>
          <p class="text-xs text-gray-500 mt-1">Найти ID можно через @userinfobot в Telegram</p>
        </div>

        <!-- Имя -->
        <div>
          <label class="block text-sm font-medium mb-1">Имя *</label>
          <input
            v-model="firstName"
            type="text"
            placeholder="Иван"
            class="w-full rounded-xl border px-4 py-2 outline-none focus:border-black"
            :class="errors.firstName ? 'border-red-500' : 'border-gray-200'"
          />
          <p v-if="errors.firstName" class="text-xs text-red-500 mt-1">{{ errors.firstName }}</p>
        </div>

        <!-- Фамилия -->
        <div>
          <label class="block text-sm font-medium mb-1">Фамилия</label>
          <input
            v-model="lastName"
            type="text"
            placeholder="Иванов"
            class="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-black"
          />
        </div>

        <!-- Username -->
        <div>
          <label class="block text-sm font-medium mb-1">Telegram Username</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
            <input
              v-model="username"
              type="text"
              placeholder="ivanov"
              class="w-full rounded-xl border border-gray-200 px-4 py-2 pl-8 outline-none focus:border-black"
            />
          </div>
        </div>

        <!-- Телефон -->
        <div>
          <label class="block text-sm font-medium mb-1">Телефон *</label>
          <input
            v-model="phone"
            type="tel"
            placeholder="+998901234567"
            class="w-full rounded-xl border px-4 py-2 outline-none focus:border-black"
            :class="errors.phone ? 'border-red-500' : 'border-gray-200'"
          />
          <p v-if="errors.phone" class="text-xs text-red-500 mt-1">{{ errors.phone }}</p>
        </div>
      </div>

      <!-- Поля для мастера -->
      <div v-if="userType === 'master'" class="space-y-4">
        <!-- Информация о барбершопе -->
        <div class="rounded-2xl bg-white p-4 shadow space-y-4">
          <h2 class="font-semibold text-lg">Информация о барбершопе</h2>

          <!-- Название -->
          <div>
            <label class="block text-sm font-medium mb-1">Название барбершопа *</label>
            <input
              v-model="masterName"
              type="text"
              placeholder="Барбершоп на Навои"
              class="w-full rounded-xl border px-4 py-2 outline-none focus:border-black"
              :class="errors.masterName ? 'border-red-500' : 'border-gray-200'"
            />
            <p v-if="errors.masterName" class="text-xs text-red-500 mt-1">{{ errors.masterName }}</p>
          </div>

          <!-- О себе -->
          <div>
            <label class="block text-sm font-medium mb-1">Описание</label>
            <textarea
              v-model="bio"
              rows="3"
              placeholder="Расскажите о себе и своих услугах..."
              class="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-black"
            />
          </div>

          <!-- Фото URL -->
          <div>
            <label class="block text-sm font-medium mb-1">Ссылка на фото</label>
            <input
              v-model="photoUrl"
              type="url"
              placeholder="https://example.com/photo.jpg"
              class="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-black"
            />
          </div>
        </div>

        <!-- Цены -->
        <div class="rounded-2xl bg-white p-4 shadow space-y-4">
          <h2 class="font-semibold text-lg">Цены</h2>

          <div class="grid grid-cols-2 gap-4">
            <!-- 30 мин -->
            <div>
              <label class="block text-sm font-medium mb-1">30 минут</label>
              <div class="relative">
                <input
                  v-model.number="price30min"
                  type="number"
                  min="0"
                  step="1000"
                  class="w-full rounded-xl border border-gray-200 px-4 py-2 pr-16 outline-none focus:border-black"
                />
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">сум</span>
              </div>
            </div>

            <!-- 60 мин -->
            <div>
              <label class="block text-sm font-medium mb-1">60 минут</label>
              <div class="relative">
                <input
                  v-model.number="price60min"
                  type="number"
                  min="0"
                  step="1000"
                  class="w-full rounded-xl border border-gray-200 px-4 py-2 pr-16 outline-none focus:border-black"
                />
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">сум</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Локация -->
        <div class="rounded-2xl bg-white p-4 shadow space-y-4">
          <h2 class="font-semibold text-lg">Расположение</h2>

          <!-- Адрес -->
          <div>
            <label class="block text-sm font-medium mb-1">Адрес *</label>
            <input
              v-model="address"
              type="text"
              placeholder="ул. Навои, 25"
              class="w-full rounded-xl border px-4 py-2 outline-none focus:border-black"
              :class="errors.address ? 'border-red-500' : 'border-gray-200'"
            />
            <p v-if="errors.address" class="text-xs text-red-500 mt-1">{{ errors.address }}</p>
          </div>

          <!-- Координаты -->
          <div>
            <label class="block text-sm font-medium mb-1">Координаты *</label>
            <div class="grid grid-cols-2 gap-2">
              <input
                v-model="lat"
                type="text"
                placeholder="Широта (41.xxxxx)"
                class="rounded-xl border px-4 py-2 outline-none focus:border-black"
                :class="errors.location ? 'border-red-500' : 'border-gray-200'"
              />
              <input
                v-model="lng"
                type="text"
                placeholder="Долгота (69.xxxxx)"
                class="rounded-xl border px-4 py-2 outline-none focus:border-black"
                :class="errors.location ? 'border-red-500' : 'border-gray-200'"
              />
            </div>
            <p v-if="errors.location" class="text-xs text-red-500 mt-1">{{ errors.location }}</p>
            <button
              type="button"
              @click="getCurrentLocation"
              class="mt-2 text-sm text-blue-600 hover:underline"
            >
              📍 Использовать мою геолокацию
            </button>
          </div>
        </div>
      </div>

      <!-- Кнопки -->
      <div class="flex gap-2">
        <button
          type="submit"
          :disabled="loading"
          class="flex-1 rounded-xl bg-black text-white p-4 font-semibold disabled:opacity-50"
        >
          <span v-if="loading">Создание...</span>
          <span v-else>Создать {{ userType === 'master' ? 'мастера' : 'администратора' }}</span>
        </button>
        <button
          type="button"
          @click="resetForm"
          class="px-6 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Очистить
        </button>
      </div>
    </form>
  </div>
</template>