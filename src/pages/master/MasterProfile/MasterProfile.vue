<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import {
  getMasterProfileByTelegramId,
  updateMasterProfile,
  updateUserPhone
} from "@/api/master"
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

const errors = ref<{ name?: string; price30?: string; price60?: string; phone?: string }>({})

let reqToken = 0
const fileInputRef = ref<HTMLInputElement | null>(null)
const pickedFileName = ref("")

function normalizeUzPhone(input: string) {
  let s = (input || "").trim()
  if (!s) return "+998 "
  if (s.startsWith("998")) s = "+" + s

  if (s.startsWith("+")) {
    if (!s.startsWith("+998")) {
      s = "+998 " + s.replace(/[^\d]/g, "").slice(0, 9)
    }
    return s
  }

  if (!s.startsWith("+998")) {
    const digits = s.replace(/[^\d]/g, "")
    const last9 = digits.slice(-9)
    return "+998 " + last9
  }

  return s
}

function validatePhone(val?: string | null) {
  if (!val) return ""
  const s = val.trim()
  if (!s.startsWith("+998")) return "Телефон должен начинаться с +998"
  const digits = s.replace(/[^\d]/g, "")
  if (digits.length < 12) return "Введите полный номер (+998 XX XXX XX XX)"
  return ""
}

// ---- Load profile
async function loadProfile() {
  const token = ++reqToken
  try {
    loading.value = true
    error.value = ""

    const tgUser = getTelegramUser()
    if (!tgUser?.id) {
      error.value = "Telegram user not found"
      profile.value = null
      return
    }

    const data = await getMasterProfileByTelegramId(tgUser.id)
    if (token !== reqToken) return

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
    if (token !== reqToken) return
    console.error("Error loading profile:", err)
    error.value = "Не удалось загрузить профиль"
    profile.value = null
  } finally {
    if (token !== reqToken) return
    loading.value = false
  }
}

function startEdit() {
  if (!profile.value) return
  errors.value = {}
  pickedFileName.value = ""
  draft.value = {
    ...profile.value,
    phone: profile.value.phone ? normalizeUzPhone(profile.value.phone) : "+998 "
  }
  isEditing.value = true
}

function cancelEdit() {
  errors.value = {}
  draft.value = {}
  pickedFileName.value = ""
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

  const phoneErr = validatePhone(draft.value.phone ?? null)
  if (phoneErr) errors.value.phone = phoneErr

  return Object.keys(errors.value).length === 0
}

async function saveEdit() {
  if (!validate() || !profile.value) return

  try {
    saving.value = true
    error.value = ""

    await updateMasterProfile(profile.value.userId, {
      name: draft.value.name?.trim(),
      bio: draft.value.bio?.trim() || undefined,
      photoUrl: draft.value.photoUrl?.trim() || undefined,
      price30min: draft.value.price30min,
      price60min: draft.value.price60min
    })

    const newPhone = (draft.value.phone || "").trim()
    const oldPhone = (profile.value.phone || "").trim()

    if (newPhone && newPhone !== oldPhone) {
      await updateUserPhone(profile.value.userId, normalizeUzPhone(newPhone))
    }

    profile.value = {
      ...profile.value,
      ...draft.value,
      phone: newPhone ? normalizeUzPhone(newPhone) : profile.value.phone
    } as MasterProfile

    isEditing.value = false
  } catch (err: any) {
    console.error("Error saving profile:", err)
    error.value = "Не удалось сохранить изменения"
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

function openFilePicker() {
  fileInputRef.value?.click()
}

async function onPickPhoto(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith("image/")) return

  pickedFileName.value = file.name
  const dataUrl = await readFileAsDataURL(file)
  draft.value.photoUrl = dataUrl
}

function onPhoneInput() {
  if (!isEditing.value) return
  const val = String(draft.value.phone || "")
  draft.value.phone = normalizeUzPhone(val)
}

const displayUsername = computed(() => {
  const username = isEditing.value ? draft.value.username : profile.value?.username
  return username ? `@${username}` : "—"
})

const avatarUrl = computed(() => {
  return isEditing.value ? (draft.value.photoUrl || "") : (profile.value?.photoUrl || "")
})

const phoneView = computed(() => {
  return profile.value?.phone ? normalizeUzPhone(profile.value.phone) : "—"
})

onMounted(() => {
  loadProfile()
})
</script>

<template>
  <div class="page">
    <!-- Topbar -->
    <div class="topbar">
      <div class="topbar-card">
        <button
          class="icon-btn"
          type="button"
          @click="loadProfile"
          :disabled="loading"
          aria-label="Обновить"
          title="Обновить"
        >
          <svg class="btn-ic" viewBox="0 0 24 24" fill="none">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M21 3v6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div class="topbar-text">
          <div class="topbar-title">Профиль</div>
          <div class="topbar-subtitle">
            <span v-if="loading">Загрузка…</span>
            <span v-else-if="error">Есть проблема</span>
            <span v-else>Настройки мастера</span>
          </div>
        </div>

        <button
          v-if="!isEditing && profile"
          class="primary-mini"
          type="button"
          @click="startEdit"
          aria-label="Изменить"
          title="Изменить"
        >
          <span class="mini-ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
          </span>
          Изменить
        </button>

        <button
          v-else-if="isEditing"
          class="ghost-mini"
          type="button"
          :disabled="saving"
          @click="cancelEdit"
          aria-label="Отмена"
          title="Отмена"
        >
          Отмена
        </button>

        <div v-else style="width: 90px;"></div>
      </div>
    </div>

    <div class="content">
      <!-- Error -->
      <div v-if="!loading && error" class="state-card">
        <div class="state-icon">⚠️</div>
        <div class="state-text">
          <p class="state-title">Не удалось загрузить профиль</p>
          <p class="state-subtitle">{{ error }}</p>
        </div>
        <button class="primary-btn" type="button" @click="loadProfile">
          Повторить
        </button>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="skeleton-list">
        <div class="skeleton-card" v-for="i in 2" :key="i">
          <div class="skeleton-line w-40"></div>
          <div class="skeleton-line w-60"></div>
          <div class="skeleton-line w-70"></div>
        </div>
      </div>

      <!-- VIEW -->
      <div v-else-if="!isEditing && profile" class="glass-card">
        <div class="profile-head">
          <div class="avatar">
            <img v-if="avatarUrl" :src="avatarUrl" class="avatar-img" alt="photo" />
            <span v-else class="avatar-emoji">💈</span>
          </div>

          <div class="head-text">
            <div class="name">{{ profile.name }}</div>
            <div class="sub">{{ phoneView }}</div>
            <div class="chips">
              <span class="chip">Telegram: {{ displayUsername }}</span>
            </div>
          </div>
        </div>

        <div class="block">
          <div class="row">
            <span class="muted">Адрес</span>
            <b class="right">{{ profile.address }}</b>
          </div>
        </div>

        <div v-if="profile.bio" class="block">
          <div class="block-title">О себе</div>
          <div class="bio">{{ profile.bio }}</div>
        </div>

        <div class="block">
          <div class="block-title">Цены</div>
          <div class="row">
            <span class="muted">30 минут</span>
            <b>{{ profile.price30min.toLocaleString() }} сум</b>
          </div>
          <div class="row">
            <span class="muted">60 минут</span>
            <b>{{ profile.price60min.toLocaleString() }} сум</b>
          </div>
        </div>
      </div>

      <!-- EDIT -->
      <div v-else-if="isEditing" class="glass-card">
        <div class="profile-head">
          <div class="avatar">
            <img v-if="draft.photoUrl" :src="String(draft.photoUrl)" class="avatar-img" alt="photo" />
            <span v-else class="avatar-emoji">💈</span>
          </div>

          <div class="head-text">
            <div class="name">Редактирование</div>
            <div class="sub break">
              Измените данные и нажмите “Сохранить”
            </div>
          </div>
        </div>

        <div class="form-grid">
          <!-- Photo upload (pretty) -->
          <div class="field">
            <label class="label">Фото</label>

            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="file-hidden"
              @change="onPickPhoto"
            />

            <button type="button" class="upload-btn" @click="openFilePicker">
              <span class="upload-ic" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 16V4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M7 9l5-5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M20 20H4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </span>
              <span class="upload-text">
                {{ pickedFileName ? pickedFileName : "Выбрать фото" }}
              </span>
            </button>

            <div class="hint break">
              Можно загрузить фото или вставить URL ниже
            </div>
          </div>

          <div class="field">
            <label class="label">URL фото</label>
            <input
              v-model="draft.photoUrl"
              type="text"
              class="input"
              placeholder="https://example.com/photo.jpg"
            />
          </div>

          <div class="field">
            <label class="label">Название барбершопа *</label>
            <input v-model="draft.name" type="text" class="input" placeholder="Barber Uzbek" />
            <div v-if="errors.name" class="err">{{ errors.name }}</div>
          </div>

          <div class="field">
            <label class="label">Телефон</label>
            <input
              v-model="draft.phone"
              type="tel"
              class="input"
              placeholder="+998 90 123 45 67"
              @input="onPhoneInput"
              @focus="onPhoneInput"
            />
            <div v-if="errors.phone" class="err">{{ errors.phone }}</div>
          </div>

          <div class="field">
            <label class="label">О себе</label>
            <textarea v-model="draft.bio" rows="3" class="textarea" placeholder="Фейды, классика, борода..." />
          </div>

          <div class="field">
            <label class="label">Цена 30 мин *</label>
            <div class="money">
              <input v-model.number="draft.price30min" type="number" min="1" step="1000" class="input pr" />
              <span class="suffix">сум</span>
            </div>
            <div v-if="errors.price30" class="err">{{ errors.price30 }}</div>
          </div>

          <div class="field">
            <label class="label">Цена 60 мин *</label>
            <div class="money">
              <input v-model.number="draft.price60min" type="number" min="1" step="1000" class="input pr" />
              <span class="suffix">сум</span>
            </div>
            <div v-if="errors.price60" class="err">{{ errors.price60 }}</div>
          </div>
        </div>

        <div class="actions">
          <button class="btn-primary" type="button" :disabled="saving" @click="saveEdit">
            <span v-if="saving">Сохранение…</span>
            <span v-else>Сохранить</span>
          </button>
          <button class="btn-ghost" type="button" :disabled="saving" @click="cancelEdit">
            Отмена
          </button>
        </div>
      </div>

      <div class="bottom-space"></div>
    </div>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  width: 100%;
  min-height: 100%;
  background: #f6f7fb;
}

* {
  box-sizing: border-box;
}

/* ensure long text never breaks layout */
.break {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 12px 12px 8px;
  background: linear-gradient(180deg, rgba(246, 247, 251, 0.92), rgba(246, 247, 251, 0));
  backdrop-filter: blur(8px);
}
.topbar-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.topbar-text { min-width: 0; }
.topbar-title { font-size: 14px; font-weight: 900; color: #0f172a; letter-spacing: -0.2px; }
.topbar-subtitle { margin-top: 2px; font-size: 12px; font-weight: 700; color: rgba(15, 23, 42, 0.55); }

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  color: rgba(15, 23, 42, 0.85);
  display: grid;
  place-items: center;
}
.icon-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ic { width: 18px; height: 18px; }

.primary-mini, .ghost-mini {
  height: 40px;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
}
.primary-mini {
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.22);
}
.ghost-mini {
  color: rgba(15, 23, 42, 0.85);
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
}
.mini-ic { width: 16px; height: 16px; display: inline-flex; }
.mini-ic svg { width: 16px; height: 16px; }

.content {
  padding: 8px 12px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Glass card */
.glass-card {
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

/* Profile head */
.profile-head {
  display: grid;
  grid-template-columns: 74px 1fr;
  gap: 12px;
  align-items: center;
}
.avatar {
  width: 74px;
  height: 74px;
  border-radius: 22px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-emoji { font-size: 28px; }

.head-text { min-width: 0; }
.name {
  font-size: 16px;
  font-weight: 900;
  color: #0f172a;
  line-height: 1.2;
}
.sub {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.55);
  overflow-wrap: anywhere;
}
.chips { margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  color: rgba(15, 23, 42, 0.75);
  background: rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.block { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(15, 23, 42, 0.08); }
.block-title { font-size: 12px; font-weight: 900; color: rgba(15, 23, 42, 0.75); margin-bottom: 10px; }

.row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.75);
}
.muted { color: rgba(15, 23, 42, 0.55); }
.right { text-align: right; overflow-wrap: anywhere; }

.bio { font-size: 12px; font-weight: 800; color: rgba(15, 23, 42, 0.75); line-height: 1.35; overflow-wrap: anywhere; }

/* Form */
.form-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.label { font-size: 12px; font-weight: 900; color: rgba(15, 23, 42, 0.65); }

.input, .textarea {
  width: 100%;
  max-width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(255, 255, 255, 0.55);
  padding: 12px 12px;
  outline: none;
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}
.textarea { resize: vertical; min-height: 90px; }

.input:focus, .textarea:focus {
  border-color: rgba(15, 23, 42, 0.28);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.06);
}

.hint {
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.5);
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.err { font-size: 12px; font-weight: 800; color: #b91c1c; }

.money { position: relative; width: 100%; }
.pr { padding-right: 56px; }
.suffix {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  font-weight: 900;
  color: rgba(15, 23, 42, 0.55);
}

/* Upload */
.file-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.upload-btn {
  width: 100%;
  max-width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(255, 255, 255, 0.55);
  padding: 12px 12px;
  cursor: pointer;

  display: flex;
  align-items: center;
  gap: 10px;

  transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
}
.upload-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08);
  border-color: rgba(15, 23, 42, 0.18);
}
.upload-ic {
  width: 18px;
  height: 18px;
  color: rgba(15, 23, 42, 0.75);
  flex: 0 0 auto;
}
.upload-ic svg { width: 18px; height: 18px; }
.upload-text {
  font-size: 13px;
  font-weight: 900;
  color: rgba(15, 23, 42, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

/* Actions */
.actions {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.btn-primary, .btn-ghost {
  border: none;
  cursor: pointer;
  border-radius: 14px;
  padding: 12px 12px;
  font-size: 13px;
  font-weight: 900;
}
.btn-primary {
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost {
  color: rgba(15, 23, 42, 0.85);
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
}

/* Error state */
.state-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(239, 68, 68, 0.18);
}
.state-icon {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 22px;
  background: rgba(239, 68, 68, 0.10);
  border: 1px solid rgba(239, 68, 68, 0.18);
}
.state-title { margin: 0; font-size: 13px; font-weight: 900; color: #0f172a; }
.state-subtitle { margin: 4px 0 0; font-size: 12px; font-weight: 700; color: rgba(15, 23, 42, 0.55); line-height: 1.2; overflow-wrap: anywhere; }
.primary-btn {
  padding: 10px 14px;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Skeleton */
.skeleton-list { display: flex; flex-direction: column; gap: 10px; }
.skeleton-card {
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.55);
}
.skeleton-line {
  height: 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  animation: pulse 1.2s ease-in-out infinite;
  margin: 8px 0;
}
.w-40 { width: 40%; }
.w-60 { width: 60%; }
.w-70 { width: 70%; }
@keyframes pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }

.bottom-space { height: 90px; }

/* Small screens */
@media (max-width: 375px) {
  .glass-card { padding: 12px; border-radius: 16px; }
  .profile-head { grid-template-columns: 68px 1fr; }
  .avatar { width: 68px; height: 68px; border-radius: 20px; }
  .actions { grid-template-columns: 1fr; }
}
</style>
