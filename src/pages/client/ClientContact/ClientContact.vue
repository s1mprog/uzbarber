<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { useBookingStore } from "@/stores/booking"
import { getMasterById } from "@/api/client"

const router = useRouter()
const booking = useBookingStore()

const isFlowValid = computed(() => !!(booking.masterId && booking.date && booking.time))

const name = ref(booking.clientName || "")
const phone = ref(booking.clientPhone || "")
const comment = ref(booking.comment || "")

const nameError = ref("")
const phoneError = ref("")

// master display
const masterName = ref<string>("")
const loadingMaster = ref(false)

function normalizePhone(value: string) {
  // оставляем цифры и +
  let v = value.replace(/[^\d+]/g, "")

  // если "+" не в начале — убираем
  if (v.includes("+") && !v.startsWith("+")) v = v.replace(/\+/g, "")

  // оставляем только один "+"
  if (v.startsWith("+")) v = "+" + v.slice(1).replace(/\+/g, "")

  return v
}

function ensureUzPrefix(value: string) {
  const v = normalizePhone(value)
  // если пусто — даём префикс
  if (!v) return "+998"
  // если пользователь начал без "+", подставим
  if (!v.startsWith("+")) return "+998" + v
  // если начинается с "+" но не +998 — не ломаем, но если это просто "+" → сделаем +998
  if (v === "+") return "+998"
  // если уже начинается с +998 — ок
  if (v.startsWith("+998")) return v
  // иначе оставим как есть (на случай иностранных номеров), но ты просил +998 в начале:
  // сделаем мягко: если пользователь ввёл "+9" / "+99" — дополним до "+998"
  if (v.startsWith("+9") && !v.startsWith("+998")) {
    const digits = v.replace(/[^\d]/g, "")
    // digits starts with "9..."
    if ("998".startsWith(digits)) return "+998"
  }
  return v
}

function validate() {
  nameError.value = ""
  phoneError.value = ""

  if (!name.value.trim()) nameError.value = "Введите имя"
  if (!phone.value.trim() || phone.value.trim() === "+998") phoneError.value = "Введите номер"

  const digits = phone.value.replace(/[^\d]/g, "")
  // digits includes 998 + остальное
  // Для Узбекистана: +998 + 9 цифр = 12 цифр всего
  if (!phoneError.value && digits.length < 12) phoneError.value = "Номер слишком короткий"

  return !nameError.value && !phoneError.value
}

const canContinue = computed(() => {
  return (
    isFlowValid.value &&
    !!name.value.trim() &&
    !!phone.value.trim() &&
    phone.value.trim() !== "+998" &&
    !nameError.value &&
    !phoneError.value
  )
})

function goBack() {
  if (window.history.length > 1) router.back()
  else if (booking.masterId && booking.date) {
    router.replace({ name: "ClientTime", params: { id: booking.masterId }, query: { date: booking.date } })
  } else {
    router.replace({ name: "ClientMap" })
  }
}

function clearForm() {
  name.value = ""
  phone.value = "+998"
  comment.value = ""
  nameError.value = ""
  phoneError.value = ""
}

function onPhoneFocus() {
  if (!isFlowValid.value) return
  // если пусто или коротко — ставим +998
  phone.value = ensureUzPrefix(phone.value)
}

function continueToCheckout() {
  if (!isFlowValid.value) {
    router.replace({ name: "ClientMap" })
    return
  }

  if (!validate()) return

  booking.setClient(name.value.trim(), normalizePhone(phone.value.trim()))
  booking.setComment(comment.value.trim())

  router.push({ name: "ClientCheckout" })
}

// мягкая нормализация + префикс на вводе
watch(phone, (v) => {
  if (!isFlowValid.value) return
  const next = ensureUzPrefix(v)
  if (next !== v) phone.value = next
})

// авто-валидация после изменений (если были ошибки)
watch([name, phone], () => {
  if (nameError.value || phoneError.value) validate()
})

const prettyDate = computed(() => {
  const raw = booking.date
  if (!raw) return "—"
  const d = new Date(raw + "T00:00:00")
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString("ru-RU", { weekday: "short", day: "2-digit", month: "long" })
})

const prettyTime = computed(() => booking.time || "—")

async function loadMasterName() {
  if (!booking.masterId) {
    masterName.value = ""
    return
  }
  const id = booking.masterId
  loadingMaster.value = true
  try {
    const m = await getMasterById(id)
    masterName.value = m?.name || ""
  } catch (e) {
    console.error(e)
    masterName.value = ""
  } finally {
    loadingMaster.value = false
  }
}

onMounted(async () => {
  // если номер пустой — сразу подготовим +998 (но не мешаем, если уже есть)
  if (!phone.value) phone.value = "+998"
  await loadMasterName()
})
</script>

<template>
  <div class="client-contact-page">
    <!-- Topbar -->
    <div class="topbar">
      <div class="topbar-card">
        <button class="icon-btn" type="button" @click="goBack" aria-label="Назад" title="Назад">
          <svg class="btn-ic" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div class="topbar-text">
          <div class="topbar-title">
            <span class="mini-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M20 21a8 8 0 0 0-16 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" stroke-width="2"/>
              </svg>
            </span>
            Ваши данные
          </div>
          <div class="topbar-subtitle">
            <span class="mini-ic sub" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 2 4 5v7c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V5l-8-3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="m8.5 12 2.2 2.2 4.8-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            Имя и номер обязательны
          </div>
        </div>

        <button class="icon-btn" type="button" @click="clearForm" aria-label="Очистить" title="Очистить">
          <svg class="btn-ic" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M8 6V4h8v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M6 6l1 16h10l1-16" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="content">
      <!-- Flow invalid -->
      <div v-if="!isFlowValid" class="sheet">
        <div class="sheet-card">
          <div class="sheet-icon error">⚠️</div>
          <div class="sheet-text">
            <p class="sheet-title">Сначала выберите мастера, день и время</p>
            <p class="sheet-subtitle">Вернитесь на карту и начните запись заново.</p>
          </div>
          <button class="primary-btn" type="button" @click="$router.replace({ name: 'ClientMap' })">
            На карту
          </button>
        </div>
      </div>

      <!-- Summary -->
      <div class="glass-card">
        <div class="summary-row">
          <div class="summary-left">
            <div class="summary-title">
              <span class="mini-ic" aria-hidden="true">
                <!-- scissors -->
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 7.5C7 9.43 5.43 11 3.5 11S0 9.43 0 7.5 1.57 4 3.5 4 7 5.57 7 7.5Z"
                    transform="translate(2 1)"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <path
                    d="M7 16.5C7 18.43 5.43 20 3.5 20S0 18.43 0 16.5 1.57 13 3.5 13 7 14.57 7 16.5Z"
                    transform="translate(2 1)"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <path d="M10 7l12-6M10 17l12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
              </span>

              <span v-if="loadingMaster" class="skeleton-line w-60"></span>
              <span v-else>{{ masterName || "Мастер" }}</span>
            </div>

            <div class="summary-sub">
              <span class="mini-ic sub" aria-hidden="true">
                <!-- calendar -->
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M7 3v3M17 3v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                        stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
              </span>
              {{ prettyDate }}
              <span class="sep">•</span>
              <span class="mini-ic sub" aria-hidden="true">
                <!-- clock -->
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 8v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" stroke-width="2"/>
                </svg>
              </span>
              {{ prettyTime }}
            </div>
          </div>

          <div class="summary-right">
            <span class="badge">
              <span class="dot"></span>
              Готово
            </span>
          </div>
        </div>
      </div>

      <!-- Form -->
      <div class="glass-card">
        <div class="form">
          <div class="field">
            <label class="label">Имя *</label>
            <div class="input-wrap" :class="{ invalid: !!nameError }">
              <span class="field-ic" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M20 21a8 8 0 0 0-16 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" stroke-width="2"/>
                </svg>
              </span>
              <input
                v-model="name"
                type="text"
                class="input"
                placeholder="Например: Aziz"
                autocomplete="name"
                :disabled="!isFlowValid"
                @blur="validate"
              />
            </div>
            <div v-if="nameError" class="error-text">{{ nameError }}</div>
          </div>

          <div class="field">
            <label class="label">Номер *</label>
            <div class="input-wrap" :class="{ invalid: !!phoneError }">
              <span class="field-ic" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9Z"
                        stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
              </span>
              <input
                v-model="phone"
                type="tel"
                class="input"
                placeholder="+998 90 123 45 67"
                autocomplete="tel"
                inputmode="tel"
                :disabled="!isFlowValid"
                @focus="onPhoneFocus"
                @blur="validate"
              />
            </div>
            <div v-if="phoneError" class="error-text">{{ phoneError }}</div>
          </div>

          <div class="field">
            <label class="label">Комментарий (опционально)</label>
            <div class="textarea-wrap">
              <span class="field-ic textarea-ic" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"
                        stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
              </span>
              <textarea
                v-model="comment"
                rows="3"
                class="textarea"
                placeholder="Например: хочу фейд, без бороды"
                :disabled="!isFlowValid"
              />
            </div>
          </div>

          <button type="button" class="primary-wide" :disabled="!canContinue" @click="continueToCheckout">
            Продолжить
          </button>

          <div class="hint">Мы используем номер только для подтверждения записи.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.client-contact-page {
  position: relative;
  width: 100%;
  min-height: 100%;
  background: #f6f7fb;
  padding-bottom: 16px;
}

/* Topbar */
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
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.topbar-text { min-width: 0; }

.topbar-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.2px;
}

.topbar-subtitle {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 2px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Content */
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
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

/* Icon btn */
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
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.icon-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(0, 0, 0, 0.10); }
.icon-btn:active { transform: translateY(0); }
.btn-ic { width: 18px; height: 18px; }

/* Mini icons */
.mini-ic {
  width: 16px;
  height: 16px;
  display: inline-flex;
  color: rgba(15, 23, 42, 0.70);
}
.mini-ic svg { width: 16px; height: 16px; }
.mini-ic.sub { color: rgba(15, 23, 42, 0.55); }

/* Summary */
.summary-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
}
.summary-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  font-weight: 900;
  color: #0f172a;
}
.summary-sub {
  margin-top: 6px;
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.55);
  flex-wrap: wrap;
}
.sep { opacity: 0.55; padding: 0 2px; }

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  color: #0f172a;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15);
}

/* Sheet (invalid flow) */
.sheet { position: relative; }
.sheet-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.16);
}
.sheet-icon {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 22px;
  background: rgba(239, 68, 68, 0.10);
  border: 1px solid rgba(239, 68, 68, 0.18);
}
.sheet-text { min-width: 0; }
.sheet-title { margin: 0; font-size: 14px; font-weight: 900; color: #0f172a; }
.sheet-subtitle { margin: 4px 0 0; font-size: 12px; font-weight: 700; color: rgba(15, 23, 42, 0.55); }

.primary-btn {
  padding: 10px 14px;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.28);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.primary-btn:hover { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(102, 126, 234, 0.34); }
.primary-btn:active { transform: translateY(0); }

/* Form */
.form { display: flex; flex-direction: column; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 6px; }

.label { font-size: 12px; font-weight: 800; color: rgba(15, 23, 42, 0.60); }

.input-wrap {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(255, 255, 255, 0.60);
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.input-wrap:focus-within {
  border-color: rgba(102, 126, 234, 0.35);
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.12);
}
.input-wrap.invalid {
  border-color: rgba(239, 68, 68, 0.35);
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.10);
}

.field-ic {
  width: 18px;
  height: 18px;
  display: inline-flex;
  color: rgba(15, 23, 42, 0.60);
}
.field-ic svg { width: 18px; height: 18px; }

.input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}
.input::placeholder { color: rgba(15, 23, 42, 0.35); }

.textarea-wrap {
  position: relative;
  padding: 12px 12px 12px 40px;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(255, 255, 255, 0.60);
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.textarea-wrap:focus-within {
  border-color: rgba(102, 126, 234, 0.35);
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.12);
}
.textarea-ic { position: absolute; left: 12px; top: 12px; }

.textarea {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}
.textarea::placeholder { color: rgba(15, 23, 42, 0.35); }

.error-text { font-size: 12px; font-weight: 800; color: rgba(239, 68, 68, 0.95); }

/* Continue button */
.primary-wide {
  margin-top: 6px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 900;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 14px 28px rgba(102, 126, 234, 0.28);
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}
.primary-wide:hover { transform: translateY(-1px); box-shadow: 0 18px 34px rgba(102, 126, 234, 0.34); }
.primary-wide:active { transform: translateY(0); }
.primary-wide:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none !important;
  box-shadow: none !important;
}

.hint {
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.55);
  margin-top: 2px;
}

/* Skeleton */
.skeleton-line {
  display: inline-block;
  height: 14px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  animation: pulse 1.2s ease-in-out infinite;
  vertical-align: middle;
}
.w-60 { width: 160px; max-width: 60vw; }

@keyframes pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
</style>
