<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import {
  acceptOrder as apiAcceptOrder,
  rejectOrder as apiRejectOrder,
  getMasterIdByTelegramId
} from "@/api/master"
import { getTelegramUser } from "@/shared/auth/role"
import { notifyClientOrderAccepted, notifyClientOrderRejected } from "@/api/telegram"
import { supabase } from "@/lib/supabase"
import { statusBadgeClass, statusLabel, type Order } from "@/types/order"

const router = useRouter()

const orders = ref<Order[]>([])
const loading = ref(true)
const error = ref("")
const masterId = ref<number | null>(null)

let reqToken = 0

const today = new Date()
const pad = (n: number) => String(n).padStart(2, "0")
const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

const pendingOrders = computed(() => {
  return orders.value
    .filter((o) => o.status === "not_accepted" || o.status === "pending")
    .sort((a, b) => {
      if (a.bookingDate !== b.bookingDate) return a.bookingDate.localeCompare(b.bookingDate)
      return a.startTime.localeCompare(b.startTime)
    })
})

const todayOrders = computed(() => {
  return orders.value
    .filter((o) => o.bookingDate === todayKey)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
})

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-")
  const dt = new Date(Number(y), Number(m) - 1, Number(d))

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowKey = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`

  if (dateStr === todayKey) return "Сегодня"
  if (dateStr === tomorrowKey) return "Завтра"

  return dt.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
}

function formatPhone(phone?: string) {
  if (!phone) return "—"
  return phone
}

async function loadOrders() {
  const token = ++reqToken

  try {
    loading.value = true
    error.value = ""

    const tgUser = getTelegramUser()
    if (!tgUser?.id) {
      error.value = "Telegram user not found"
      orders.value = []
      return
    }

    const mId = await getMasterIdByTelegramId(tgUser.id)
    if (!mId) {
      error.value = "Master profile not found"
      orders.value = []
      return
    }

    masterId.value = mId

    // ✅ ВАЖНО: берём client_name и client_phone из orders
    const { data, error: fetchError } = await supabase
      .from("orders")
      .select(
        `
        id,
        booking_date,
        start_time,
        duration_minutes,
        price,
        comment,
        status,
        client_id,
        client_name,
        client_phone,
        created_at,
        updated_at,
        users!orders_client_id_fkey(
          id,
          first_name,
          last_name,
          phone
        )
      `
      )
      .eq("master_id", mId)
      .in("status", [
        "not_accepted",
        "pending",
        "booked",
        "in_progress",
        "done",
        "canceled_by_client",
        "canceled_by_master"
      ])
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true })

    if (fetchError) throw fetchError
    if (token !== reqToken) return

    orders.value = (data || []).map((row: any) => {
      const fallbackName =
        [row.users?.first_name, row.users?.last_name].filter(Boolean).join(" ") || "Клиент"

      return {
        id: row.id,
        clientId: row.client_id,
        masterId: mId,

        // ✅ сначала orders.client_name, потом users имя
        clientName: row.client_name || fallbackName,

        // ✅ сначала orders.client_phone, потом users.phone
        clientPhone: row.client_phone || row.users?.phone || "",

        comment: row.comment || undefined,
        bookingDate: row.booking_date,
        startTime: row.start_time,
        durationMinutes: row.duration_minutes,
        status: row.status,
        price: row.price,
        createdAt: row.created_at || "",
        updatedAt: row.updated_at || ""
      }
    })
  } catch (err: any) {
    if (token !== reqToken) return
    console.error("Error loading orders:", err)
    error.value = "Не удалось загрузить заказы"
    orders.value = []
  } finally {
    if (token !== reqToken) return
    loading.value = false
  }
}

async function acceptOrder(orderId: number) {
  try {
    await apiAcceptOrder(orderId)

    const o = orders.value.find((x) => x.id === orderId)
    if (o) o.status = "booked"

    // ✅ TS-safe: проверяем error + data
    const { data: orderData, error: orderErr } = await supabase
      .from("orders")
      .select(
        `
        booking_date,
        start_time,
        users!orders_client_id_fkey(telegram_chat_id),
        masters(name, address)
      `
      )
      .eq("id", orderId)
      .single()

    if (orderErr || !orderData) {
      console.warn("⚠️ orderData not found / error:", orderErr)
      return
    }

    const clientChatId =
      (orderData?.users as any)?.[0]?.telegram_chat_id || (orderData?.users as any)?.telegram_chat_id
    const masterData = (orderData?.masters as any)?.[0] || (orderData?.masters as any)

    if (clientChatId && masterData) {
      await notifyClientOrderAccepted({
        clientChatId,
        masterName: masterData.name,
        masterAddress: masterData.address,
        bookingDate: orderData.booking_date,
        startTime: orderData.start_time
      })
    }
  } catch (err) {
    console.error("Error accepting order:", err)
    alert("Не удалось принять заказ")
  }
}

async function rejectOrder(orderId: number) {
  try {
    await apiRejectOrder(orderId)

    const o = orders.value.find((x) => x.id === orderId)
    if (o) o.status = "canceled_by_master"

    const { data: orderData, error: orderErr } = await supabase
      .from("orders")
      .select(
        `
        booking_date,
        start_time,
        users!orders_client_id_fkey(telegram_chat_id),
        masters(name)
      `
      )
      .eq("id", orderId)
      .single()

    if (orderErr || !orderData) {
      console.warn("⚠️ orderData not found / error:", orderErr)
      return
    }

    const clientChatId =
      (orderData?.users as any)?.[0]?.telegram_chat_id || (orderData?.users as any)?.telegram_chat_id
    const masterData = (orderData?.masters as any)?.[0] || (orderData?.masters as any)

    if (clientChatId && masterData) {
      await notifyClientOrderRejected({
        clientChatId,
        masterName: masterData.name,
        bookingDate: orderData.booking_date,
        startTime: orderData.start_time
      })
    }
  } catch (err) {
    console.error("Error rejecting order:", err)
    alert("Не удалось отклонить заказ")
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<template>
  <div class="master-today-page">
    <!-- Topbar -->
    <div class="topbar">
      <div class="topbar-card">
        <button
          class="icon-btn"
          type="button"
          @click="router.push({ name: 'MasterCalendar' })"
          aria-label="Календарь"
          title="Календарь"
        >
          <svg class="btn-ic" viewBox="0 0 24 24" fill="none">
            <path d="M7 3v3M17 3v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path
              d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <div class="topbar-text">
          <div class="topbar-title">Сегодня</div>
          <div class="topbar-subtitle">
            <span v-if="loading">Загрузка…</span>
            <span v-else-if="error">Есть проблема с загрузкой</span>
            <span v-else>{{ todayKey }}</span>
          </div>
        </div>

        <button
          class="icon-btn"
          type="button"
          @click="loadOrders"
          :disabled="loading"
          aria-label="Обновить"
          title="Обновить"
        >
          <svg class="btn-ic" viewBox="0 0 24 24" fill="none">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M21 3v6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="content">
      <!-- Error -->
      <div v-if="!loading && error" class="state-card">
        <div class="state-icon">⚠️</div>
        <div class="state-text">
          <div class="state-title">Не удалось загрузить</div>
          <div class="state-subtitle">{{ error }}</div>
        </div>
        <button class="primary-btn" type="button" @click="loadOrders">Повторить</button>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="skeleton-list">
        <div class="skeleton-card" v-for="i in 3" :key="i">
          <div class="skeleton-line w-50"></div>
          <div class="skeleton-line w-35"></div>
          <div class="skeleton-line w-70"></div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="pendingOrders.length === 0 && todayOrders.length === 0" class="glass-card empty">
        <div class="empty-ic">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="empty-title">Заказов пока нет</div>
        <div class="empty-subtitle">Новые заявки появятся здесь</div>
      </div>

      <!-- Pending -->
      <div v-if="pendingOrders.length > 0" class="section">
        <div class="section-title">
          <span class="mini-ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 2l1.2 6.2L20 10l-6.8 1.8L12 18l-1.2-6.2L4 10l6.8-1.8L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
          </span>
          Новые заявки
          <span class="count-pill">{{ pendingOrders.length }}</span>
        </div>

        <div class="list">
          <div v-for="o in pendingOrders" :key="o.id" class="order-card pending">
            <div class="order-head">
              <div class="order-left">
                <div class="order-time">{{ o.startTime }}</div>
                <div class="order-name">{{ o.clientName }}</div>
                <div class="order-date">📅 {{ formatDate(o.bookingDate) }}</div>
              </div>

              <span class="badge-pill" :class="statusBadgeClass(o.status)">
                {{ statusLabel(o.status) }}
              </span>
            </div>

            <div class="order-row">
              <span class="muted">Телефон</span>
              <b>{{ formatPhone(o.clientPhone) }}</b>
            </div>

            <div v-if="o.comment" class="comment">💬 {{ o.comment }}</div>

            <div class="order-row">
              <span class="muted">Длительность</span>
              <b>{{ o.durationMinutes }} мин</b>
            </div>

            <div class="order-row">
              <span class="muted">Сумма</span>
              <b>{{ o.price.toLocaleString() }} сум</b>
            </div>

            <div class="actions">
              <button class="btn-primary" type="button" @click="acceptOrder(o.id)">Принять</button>
              <button class="btn-ghost" type="button" @click="rejectOrder(o.id)">Отклонить</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Today -->
      <div v-if="todayOrders.length > 0" class="section">
        <div class="section-title muted">
          <span class="mini-ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" stroke-width="2"/>
            </svg>
          </span>
          Сегодня
          <span class="count-pill ghost">{{ todayOrders.length }}</span>
        </div>

        <div class="list">
          <div v-for="o in todayOrders" :key="o.id" class="order-card">
            <div class="order-head">
              <div class="order-left">
                <div class="order-time">{{ o.startTime }}</div>
                <div class="order-name">{{ o.clientName }}</div>
              </div>
              <span class="badge-pill" :class="statusBadgeClass(o.status)">
                {{ statusLabel(o.status) }}
              </span>
            </div>

            <div class="order-row">
              <span class="muted">Телефон</span>
              <b>{{ formatPhone(o.clientPhone) }}</b>
            </div>

            <div v-if="o.comment" class="comment">💬 {{ o.comment }}</div>

            <div class="order-row">
              <span class="muted">Длительность</span>
              <b>{{ o.durationMinutes }} мин</b>
            </div>

            <div class="order-row">
              <span class="muted">Сумма</span>
              <b>{{ o.price.toLocaleString() }} сум</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* (оставь твой стиль как был, я его не меняю здесь)
   если хочешь — могу прислать полностью со стилями как в прошлом сообщении */
.master-today-page {
  position: relative;
  width: 100%;
  min-height: 100%;
  background: #f6f7fb;
  padding-bottom: 16px;
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

  padding: 12px 12px;
  border-radius: 18px;

  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);

  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
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
.btn-ic { width: 18px; height: 18px; }

.content {
  padding: 8px 12px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ниже — минимальные классы чтобы не ломалось */
.section { display: flex; flex-direction: column; gap: 10px; }
.section-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 900; color: #0f172a; }
.section-title.muted { color: rgba(15, 23, 42, 0.6); }
.mini-ic { width: 16px; height: 16px; display: inline-flex; color: rgba(15, 23, 42, 0.7); }
.mini-ic svg { width: 16px; height: 16px; }

.count-pill {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  color: #0f172a;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
}
.count-pill.ghost { color: rgba(15, 23, 42, 0.55); background: rgba(255,255,255,0.55); border-color: rgba(15,23,42,0.06); }

.list { display: flex; flex-direction: column; gap: 10px; }

.order-card {
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.order-card.pending { border: 1px solid rgba(102, 126, 234, 0.22); }

.order-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.order-left { min-width: 0; }
.order-time { font-size: 16px; font-weight: 900; color: #0f172a; }
.order-name { margin-top: 3px; font-size: 13px; font-weight: 800; color: rgba(15, 23, 42, 0.75); }
.order-date { margin-top: 6px; font-size: 12px; font-weight: 800; color: rgba(15, 23, 42, 0.55); }

.badge-pill { display: inline-block; font-size: 12px; font-weight: 900; padding: 6px 10px; border-radius: 999px; }

.order-row {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.75);
}
.order-row b { color: #0f172a; font-weight: 900; text-align: right; }
.muted { color: rgba(15, 23, 42, 0.55); }

.comment {
  margin-top: 10px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  padding: 10px;
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
  white-space: pre-wrap;
}

.actions { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

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
.btn-ghost {
  color: rgba(15, 23, 42, 0.85);
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
}

/* states */
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
.state-title { font-size: 13px; font-weight: 900; color: #0f172a; }
.state-subtitle { margin-top: 4px; font-size: 12px; font-weight: 700; color: rgba(15, 23, 42, 0.55); }
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

/* empty */
.glass-card {
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.empty {
  display: grid;
  place-items: center;
  gap: 10px;
  text-align: center;
  padding: 20px;
}
.empty-ic {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
  color: rgba(15, 23, 42, 0.7);
}
.empty-ic svg { width: 26px; height: 26px; }
.empty-title { font-size: 16px; font-weight: 900; color: #0f172a; }
.empty-subtitle { font-size: 12px; font-weight: 700; color: rgba(15, 23, 42, 0.55); }

/* skeleton */
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
.w-50 { width: 50%; }
.w-35 { width: 35%; }
.w-70 { width: 70%; }
@keyframes pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
</style>
