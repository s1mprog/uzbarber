<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrderById } from '@/api/client'
import { statusBadgeClass, statusLabel } from '@/types/order'

const route = useRoute()
const router = useRouter()

const order = ref<any>(null)
const loading = ref(true)
const error = ref('')

let pollInterval: any = null

async function loadOrder() {
	try {
		const bookingId = Number(route.params.bookingId)
		if (!bookingId) {
			error.value = 'Invalid booking ID'
			return
		}
		order.value = await getOrderById(bookingId)
	} catch (err: any) {
		console.error('Error loading order:', err)
		error.value = 'Не удалось загрузить заказ'
	} finally {
		loading.value = false
	}
}

function formatDate(dateStr: string): string {
	const date = new Date(dateStr)
	return date.toLocaleDateString('ru-RU', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		weekday: 'short',
	})
}

function getStatusMessage(status: string): {
	emoji: string
	title: string
	text: string
} {
	switch (status) {
		case 'not_accepted':
			return {
				emoji: '⏳',
				title: 'Ожидание',
				text: 'Ждём подтверждения мастера...',
			}
		case 'booked':
			return {
				emoji: '✅',
				title: 'Подтверждено',
				text: 'Мастер подтвердил запись!',
			}
		case 'in_progress':
			return {
				emoji: '✂️',
				title: 'В процессе',
				text: 'Мастер выполняет заказ',
			}
		case 'done':
			return { emoji: '🎉', title: 'Готово', text: 'Заказ выполнен!' }
		case 'canceled_by_master':
			return { emoji: '❌', title: 'Отклонено', text: 'Мастер отклонил запись' }
		case 'canceled_by_client':
			return { emoji: '🚫', title: 'Отменено', text: 'Вы отменили запись' }
		default:
			return { emoji: '❓', title: 'Неизвестно', text: 'Неизвестный статус' }
	}
}

const statusUI = computed(() => getStatusMessage(order.value?.status || ''))

function goBack() {
	if (window.history.length > 1) router.back()
	else router.replace({ name: 'ClientHistory' })
}

function goToHistory() {
	router.push({ name: 'ClientHistory' })
}

onMounted(() => {
	loadOrder()

	pollInterval = setInterval(() => {
		if (order.value?.status === 'not_accepted') loadOrder()
	}, 5000)
})

onUnmounted(() => {
	if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
	<div class="client-status-page">
		<!-- Topbar -->
		<div class="topbar">
			<div class="topbar-card">
				<button
					class="icon-btn"
					type="button"
					@click="goBack"
					aria-label="Назад"
					title="Назад"
				>
					<svg class="btn-ic" viewBox="0 0 24 24" fill="none">
						<path
							d="M15 18l-6-6 6-6"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>

				<div class="topbar-text">
					<div class="topbar-title">
						<span class="mini-ic" aria-hidden="true">
							<!-- activity -->
							<svg viewBox="0 0 24 24" fill="none">
								<path
									d="M22 12h-4l-3 9-6-18-3 9H2"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</span>
						Статус заявки
					</div>
					<div class="topbar-subtitle">ID: {{ route.params.bookingId }}</div>
				</div>

				<button
					class="icon-btn"
					type="button"
					@click="loadOrder"
					aria-label="Обновить"
					title="Обновить"
				>
					<svg class="btn-ic" viewBox="0 0 24 24" fill="none">
						<path
							d="M21 12a9 9 0 1 1-2.64-6.36"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
						<path
							d="M21 3v6h-6"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>
			</div>
		</div>

		<div class="content">
			<!-- Loading -->
			<div v-if="loading" class="glass-card center">
				<div class="skeleton-icon"></div>
				<div class="skeleton-line w-60"></div>
				<div class="skeleton-line w-40"></div>
			</div>

			<!-- Error -->
			<div v-else-if="error" class="sheet">
				<div class="sheet-card">
					<div class="sheet-icon error">⚠️</div>
					<div class="sheet-text">
						<p class="sheet-title">Ошибка</p>
						<p class="sheet-subtitle">{{ error }}</p>
					</div>
					<button class="primary-btn" type="button" @click="loadOrder">
						Повторить
					</button>
				</div>
			</div>

			<!-- Order -->
			<template v-else-if="order">
				<div class="glass-card status-card">
					<div class="emoji">{{ statusUI.emoji }}</div>
					<div class="status-title">{{ statusUI.title }}</div>
					<div class="status-text">{{ statusUI.text }}</div>

					<div class="badge-row">
						<span class="badge-pill" :class="statusBadgeClass(order.status)">
							{{ statusLabel(order.status) }}
						</span>
					</div>

					<div v-if="order.status === 'not_accepted'" class="auto">
						Обновляется автоматически каждые 5 секунд
					</div>
				</div>

				<div class="glass-card">
					<div class="card-title">
						<span class="mini-ic" aria-hidden="true">
							<!-- info -->
							<svg viewBox="0 0 24 24" fill="none">
								<path
									d="M12 8h.01"
									stroke="currentColor"
									stroke-width="3"
									stroke-linecap="round"
								/>
								<path
									d="M11 12h1v6h-1"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
								/>
								<path
									d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
									stroke="currentColor"
									stroke-width="2"
								/>
							</svg>
						</span>
						Информация о записи
					</div>

					<div class="rows">
						<div class="row">
							<span class="label">Мастер</span>
							<b class="value">{{ order.masterName || '—' }}</b>
						</div>
						<div class="row">
							<span class="label">Адрес</span>
							<b class="value right">{{ order.masterAddress || '—' }}</b>
						</div>
						<div class="row">
							<span class="label">Дата</span>
							<b class="value">{{ formatDate(order.booking_date) }}</b>
						</div>
						<div class="row">
							<span class="label">Время</span>
							<b class="value">{{ order.start_time }}</b>
						</div>
						<div class="row">
							<span class="label">Длительность</span>
							<b class="value">{{ order.duration_minutes }} мин</b>
						</div>

						<div v-if="order.comment" class="comment">
							<div class="label">Комментарий</div>
							<div class="comment-box">{{ order.comment }}</div>
						</div>

						<div class="divider"></div>

						<div class="row total">
							<span class="label">Стоимость</span>
							<b class="value">{{ order.price.toLocaleString() }} сум</b>
						</div>
					</div>
				</div>

				<div class="actions">
					<button class="secondary-wide" type="button" @click="loadOrder">
						Обновить статус
					</button>
					<button class="primary-wide" type="button" @click="goToHistory">
						Посмотреть все записи
					</button>
				</div>
			</template>
		</div>
	</div>
</template>

<style scoped>
.client-status-page {
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
	background: linear-gradient(
		180deg,
		rgba(246, 247, 251, 0.92),
		rgba(246, 247, 251, 0)
	);
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
	box-shadow:
		0 10px 30px rgba(0, 0, 0, 0.1),
		inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.topbar-text {
	min-width: 0;
}
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
	margin-top: 2px;
	font-size: 12px;
	font-weight: 700;
	color: rgba(15, 23, 42, 0.55);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.content {
	padding: 8px 12px 0;
	display: flex;
	flex-direction: column;
	gap: 12px;
}
.glass-card {
	padding: 14px;
	border-radius: 18px;
	background: rgba(255, 255, 255, 0.78);
	border: 1px solid rgba(255, 255, 255, 0.55);
	backdrop-filter: blur(14px);
	-webkit-backdrop-filter: blur(14px);
	box-shadow:
		0 12px 34px rgba(0, 0, 0, 0.1),
		inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

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
	transition:
		transform 0.15s ease,
		box-shadow 0.15s ease;
}
.icon-btn:hover {
	transform: translateY(-1px);
	box-shadow: 0 10px 22px rgba(0, 0, 0, 0.1);
}
.icon-btn:active {
	transform: translateY(0);
}
.btn-ic {
	width: 18px;
	height: 18px;
}

.mini-ic {
	width: 16px;
	height: 16px;
	display: inline-flex;
	color: rgba(15, 23, 42, 0.7);
}
.mini-ic svg {
	width: 16px;
	height: 16px;
}

.center {
	display: grid;
	gap: 10px;
	place-items: center;
	padding: 22px;
}
.skeleton-icon {
	width: 44px;
	height: 44px;
	border-radius: 16px;
	background: rgba(15, 23, 42, 0.08);
	animation: pulse 1.2s ease-in-out infinite;
}
.skeleton-line {
	height: 12px;
	border-radius: 999px;
	background: rgba(15, 23, 42, 0.08);
	animation: pulse 1.2s ease-in-out infinite;
}
.w-60 {
	width: 60%;
}
.w-40 {
	width: 40%;
}
@keyframes pulse {
	0%,
	100% {
		opacity: 0.55;
	}
	50% {
		opacity: 1;
	}
}

.status-card {
	text-align: center;
}
.emoji {
	font-size: 40px;
	line-height: 1;
	margin-bottom: 8px;
}
.status-title {
	font-size: 16px;
	font-weight: 900;
	color: #0f172a;
}
.status-text {
	margin-top: 4px;
	font-size: 13px;
	font-weight: 700;
	color: rgba(15, 23, 42, 0.55);
}

.badge-row {
	margin-top: 10px;
}
.badge-pill {
	display: inline-block;
	font-size: 12px;
	font-weight: 900;
	padding: 6px 10px;
	border-radius: 999px;
}

.auto {
	margin-top: 10px;
	font-size: 12px;
	font-weight: 700;
	color: rgba(15, 23, 42, 0.55);
}

.card-title {
	display: flex;
	gap: 8px;
	align-items: center;
	font-size: 14px;
	font-weight: 900;
	color: #0f172a;
	margin-bottom: 10px;
}
.rows {
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.row {
	display: flex;
	justify-content: space-between;
	gap: 12px;
	align-items: flex-start;
}
.label {
	font-size: 12px;
	font-weight: 800;
	color: rgba(15, 23, 42, 0.6);
}
.value {
	font-size: 13px;
	font-weight: 900;
	color: #0f172a;
}
.value.right {
	text-align: right;
	max-width: 58%;
}
.divider {
	height: 1px;
	background: rgba(15, 23, 42, 0.08);
	margin: 2px 0;
}
.row.total .value {
	font-size: 16px;
}

.comment {
	padding-top: 6px;
}
.comment-box {
	margin-top: 6px;
	background: rgba(15, 23, 42, 0.04);
	border: 1px solid rgba(15, 23, 42, 0.08);
	border-radius: 14px;
	padding: 10px;
	font-size: 13px;
	font-weight: 800;
	color: #0f172a;
	white-space: pre-wrap;
}

.actions {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.primary-wide {
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
	transition:
		transform 0.15s ease,
		box-shadow 0.15s ease;
}
.primary-wide:hover {
	transform: translateY(-1px);
	box-shadow: 0 18px 34px rgba(102, 126, 234, 0.34);
}
.primary-wide:active {
	transform: translateY(0);
}

.secondary-wide {
	width: 100%;
	padding: 12px 14px;
	border-radius: 16px;
	border: 1px solid rgba(15, 23, 42, 0.1);
	background: rgba(255, 255, 255, 0.7);
	cursor: pointer;
	font-size: 14px;
	font-weight: 900;
	color: #0f172a;
	transition:
		transform 0.15s ease,
		box-shadow 0.15s ease;
}
.secondary-wide:hover {
	transform: translateY(-1px);
	box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}
.secondary-wide:active {
	transform: translateY(0);
}

.sheet {
	position: relative;
}
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
	background: rgba(239, 68, 68, 0.1);
	border: 1px solid rgba(239, 68, 68, 0.18);
}
.sheet-text {
	min-width: 0;
}
.sheet-title {
	margin: 0;
	font-size: 14px;
	font-weight: 900;
	color: #0f172a;
}
.sheet-subtitle {
	margin: 4px 0 0;
	font-size: 12px;
	font-weight: 700;
	color: rgba(15, 23, 42, 0.55);
	line-height: 1.2;
}
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
}
</style>
