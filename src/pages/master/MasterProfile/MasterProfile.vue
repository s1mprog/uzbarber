<script setup lang="ts">
import { computed, onMounted, ref } from "vue"

type MasterProfile = {
  photoUrl: string // dataURL или обычный URL
  name: string
  phone: string
  telegram: string
  about: string
  price: number
}

const LS_KEY = "MASTER_PROFILE_V1"

const profile = ref<MasterProfile>({
  photoUrl: "",
  name: "Master Ivan",
  phone: "+998 90 111 22 33",
  telegram: "@master_ivan",
  about: "Барбер с опытом 5 лет. Фейды, классика, борода.",
  price: 50000
})

// edit state
const isEditing = ref(false)
const draft = ref<MasterProfile>({ ...profile.value })

const errors = ref<{ name?: string; price?: string; telegram?: string }>({})

// ---- helpers
function loadFromLS() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") {
      profile.value = { ...profile.value, ...parsed }
    }
  } catch {
    // ignore
  }
}

function saveToLS() {
  localStorage.setItem(LS_KEY, JSON.stringify(profile.value))
}

function startEdit() {
  errors.value = {}
  draft.value = { ...profile.value }
  isEditing.value = true
}

function cancelEdit() {
  errors.value = {}
  draft.value = { ...profile.value }
  isEditing.value = false
}

function validate() {
  errors.value = {}

  if (!draft.value.name.trim()) errors.value.name = "Введите имя"

  if (!Number.isFinite(draft.value.price) || draft.value.price <= 0) {
    errors.value.price = "Цена должна быть больше 0"
  }

  // telegram опционально, но если есть — нормализуем
  if (draft.value.telegram.trim()) {
    const tg = draft.value.telegram.trim()
    // разрешим "@name" или "name"
    const cleaned = tg.startsWith("@") ? tg.slice(1) : tg
    // базовая проверка (буквы/цифры/_)
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(cleaned)) {
      errors.value.telegram = "Telegram должен быть типа @username"
    }
  }

  return Object.keys(errors.value).length === 0
}

function normalizeTelegram(tg: string) {
  const t = tg.trim()
  if (!t) return ""
  if (t.startsWith("@")) return t
  return "@" + t
}

function saveEdit() {
  if (!validate()) return

  profile.value = {
    ...profile.value,
    photoUrl: draft.value.photoUrl,
    name: draft.value.name.trim(),
    telegram: normalizeTelegram(draft.value.telegram),
    about: draft.value.about.trim(),
    price: Number(draft.value.price)
  }

  saveToLS()
  isEditing.value = false
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

const hasPhoto = computed(() => !!(isEditing.value ? draft.value.photoUrl : profile.value.photoUrl))

onMounted(() => {
  loadFromLS()
})
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold">Профиль</h1>

      <button
        v-if="!isEditing"
        type="button"
        class="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-95"
        @click="startEdit"
      >
        Изменить
      </button>
    </div>

    <!-- VIEW MODE -->
    <div v-if="!isEditing" class="rounded-2xl bg-white p-4 shadow space-y-3">
      <div class="flex items-center gap-3">
        <div class="h-14 w-14 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
          <img
            v-if="profile.photoUrl"
            :src="profile.photoUrl"
            class="h-full w-full object-cover"
            alt="photo"
          />
          <span v-else class="text-xs text-gray-500">No photo</span>
        </div>

        <div>
          <div class="font-semibold">{{ profile.name }}</div>
          <div class="text-sm text-gray-500">{{ profile.phone }}</div>
        </div>
      </div>

      <div class="text-sm"><b>Telegram:</b> {{ profile.telegram || "—" }}</div>
      <div class="text-sm"><b>О себе:</b> {{ profile.about || "—" }}</div>
      <div class="text-sm"><b>Цена за стрижку:</b> {{ profile.price }}</div>
    </div>

    <!-- EDIT MODE -->
    <div v-else class="rounded-2xl bg-white p-4 shadow space-y-4">
      <div class="flex items-center gap-3">
        <div class="h-14 w-14 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
          <img
            v-if="draft.photoUrl"
            :src="draft.photoUrl"
            class="h-full w-full object-cover"
            alt="photo"
          />
          <span v-else class="text-xs text-gray-500">No photo</span>
        </div>

        <div class="flex-1">
          <label class="text-sm text-gray-600">Фото</label>
          <input
            type="file"
            accept="image/*"
            class="mt-1 block w-full text-sm"
            @change="onPickPhoto"
          />
        </div>
      </div>

      <div>
        <label class="text-sm text-gray-600">Имя *</label>
        <input
          v-model="draft.name"
          type="text"
          class="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-black"
          placeholder="Имя мастера"
        />
        <div v-if="errors.name" class="mt-1 text-xs text-red-600">{{ errors.name }}</div>
      </div>

      <div>
        <label class="text-sm text-gray-600">Telegram</label>
        <input
          v-model="draft.telegram"
          type="text"
          class="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-black"
          placeholder="@username"
        />
        <div v-if="errors.telegram" class="mt-1 text-xs text-red-600">{{ errors.telegram }}</div>
      </div>

      <div>
        <label class="text-sm text-gray-600">О себе</label>
        <textarea
          v-model="draft.about"
          rows="3"
          class="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-black"
          placeholder="Коротко про опыт и стиль"
        />
      </div>

      <div>
        <label class="text-sm text-gray-600">Цена за стрижку *</label>
        <input
          v-model.number="draft.price"
          type="number"
          min="1"
          class="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-black"
          placeholder="50000"
        />
        <div v-if="errors.price" class="mt-1 text-xs text-red-600">{{ errors.price }}</div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="rounded-xl bg-black p-3 text-white hover:opacity-95"
          @click="saveEdit"
        >
          Сохранить
        </button>
        <button
          type="button"
          class="rounded-xl bg-gray-200 p-3 text-gray-900 hover:opacity-95"
          @click="cancelEdit"
        >
          Отмена
        </button>
      </div>
    </div>
  </div>
</template>
