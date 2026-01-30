<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getMyOrders } from '@/api/client'
import { getCurrentUserId } from '@/api/auth'
import { statusBadgeClass, statusLabel, type Order } from '@/types/order'

const router = useRouter()

const orders = ref<Order[]>([])
const loading = ref(true)
const error = ref('')

async function loadOrders() {
	try {
		loading.value = true
		error.value = ''

		const clientId = await getCurrentUserId()
		const list = await getMyOrders(clientId)

		// сортировка: новые сверху (по дате+времени)
		orders.value = (list || []).slice().sort((a, b) => {
			const dateA = `${a.bookingDate} ${a.startTime}`
			const dateB = `${b.bookingDate} ${b.startTime}`
			return dateB.localeCompare(dateA)
		})
	} catch (err: any) {
		console.error('Error loading orders:', err)
		error.value = 'Не удалось загрузить историю записей'
		orders.value = []
	} finally {
		loading.value = false
	}
}

function viewOrder(orderId: number) {
	router.push({ name: 'ClientStatus', params: { bookingId: orderId } })
}

function goToMap() {
	router.push({ name: 'ClientMap' })
}

function formatDatePretty(dateStr: string): string {
	// ожидаем YYYY-MM-DD
	const d = new Date(dateStr + 'T00:00:00')
	if (Number.isNaN(d.getTime())) return dateStr
	return d.toLocaleDateString('ru-RU', {
		weekday: 'short',
		day: '2-digit',
		month: 'long',
	})
}

function toOrderDate(order: Order): Date {
	// YYYY-MM-DD + HH:mm
	const dt = new Date(`${order.bookingDate}T${order.startTime}`)
	return dt
}

function isFinalStatus(status: string) {
	return ['canceled_by_client', 'canceled_by_master', 'done'].includes(status)
}

const upcomingOrders = computed(() => {
	const now = new Date()
	return orders.value.filter((o) => {
		const dt = toOrderDate(o)
		return dt > now && !isFinalStatus(o.status)
	})
})

const pastOrders = computed(() => {
	const now = new Date()
	return orders.value.filter((o) => {
		const dt = toOrderDate(o)
		return dt <= now || isFinalStatus(o.status)
	})
})

const hasOrders = computed(() => orders.value.length > 0)

onMounted(() => {
  loadOrders()
})
</script>

<template>
	<div class="client-history-page">
		<!-- Topbar -->
		<div class="topbar">
			<div class="topbar-card">
				<button
					class="icon-btn"
					type="button"
					@click="goToMap"
					aria-label="Карта"
					title="Карта"
				>
					<!-- map -->
					<svg class="btn-ic" viewBox="0 0 24 24" fill="none">
						<path
							d="M9 20l-6 2V6l6-2 6 2 6-2v16l-6 2-6-2Z"
							stroke="currentColor"
							stroke-width="2"
							stroke-linejoin="round"
						/>
						<path
							d="M9 4v16M15 6v16"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
				</button>

				<div class="topbar-text">
					<div class="topbar-title">
						<span class="mini-ic" aria-hidden="true">
							<!-- clock -->
							<svg viewBox="0 0 24 24" fill="none">
								<path
									d="M12 8v5l3 2"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
								<path
									d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
									stroke="currentColor"
									stroke-width="2"
								/>
							</svg>
						</span>
						Мои записи
					</div>
					<div class="topbar-subtitle" v-if="!loading && !error && hasOrders">
						Всего: {{ orders.length }}
					</div>
					<div class="topbar-subtitle" v-else-if="loading">Загрузка...</div>
					<div class="topbar-subtitle" v-else-if="error">
						Есть проблема с загрузкой
					</div>
					<div class="topbar-subtitle" v-else>Пока пусто</div>
				</div>

				<button
					class="icon-btn"
					type="button"
					@click="loadOrders"
					:disabled="loading"
					aria-label="Обновить"
					title="Обновить"
				>
					<!-- refresh -->
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
			<!-- Loading (skeleton) -->
			<div v-if="loading" class="glass-card">
				<div class="skeleton-list">
					<div class="skeleton-card" v-for="i in 3" :key="i">
						<div class="skeleton-line w-60"></div>
						<div class="skeleton-line w-40"></div>
						<div class="skeleton-row">
							<div class="skeleton-pill w-30"></div>
							<div class="skeleton-pill w-25"></div>
						</div>
					</div>
				</div>
			</div>

			<!-- Error sheet -->
			<div v-else-if="error" class="sheet">
				<div class="sheet-card">
					<div class="sheet-icon error">⚠️</div>
					<div class="sheet-text">
						<p class="sheet-title">Не удалось загрузить историю</p>
						<p class="sheet-subtitle">{{ error }}</p>
					</div>
					<button class="primary-btn" type="button" @click="loadOrders">
						Повторить
					</button>
				</div>
			</div>

			<!-- Empty -->
			<div v-else-if="orders.length === 0" class="glass-card empty">
				<div class="empty-ic">
					<!-- clock -->
					<svg viewBox="0 0 24 24" fill="none">
						<path
							d="M12 8v5l3 2"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<path
							d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
							stroke="currentColor"
							stroke-width="2"
						/>
					</svg>
				</div>
				<div class="empty-title">У вас пока нет записей</div>
				<div class="empty-subtitle">Выберите мастера на карте и запишитесь</div>
				<button class="primary-wide" type="button" @click="goToMap">
					Найти мастера
				</button>
			</div>

			<!-- Lists -->
			<template v-else>
				<!-- Upcoming -->
				<div v-if="upcomingOrders.length > 0" class="section">
					<div class="section-title">
						<span class="mini-ic" aria-hidden="true">
							<!-- spark -->
							<svg viewBox="0 0 24 24" fill="none">
								<path
									d="M12 2l1.2 6.2L20 10l-6.8 1.8L12 18l-1.2-6.2L4 10l6.8-1.8L12 2Z"
									stroke="currentColor"
									stroke-width="2"
									stroke-linejoin="round"
								/>
							</svg>
						</span>
						Предстоящие
					</div>

					<div class="list">
						<button
							v-for="o in upcomingOrders"
							:key="o.id"
							type="button"
							class="order-card upcoming"
							@click="viewOrder(o.id)"
						>
							<div class="order-head">
								<div class="order-main">
									<div class="order-name">
										{{ o.masterName || `Мастер #${o.masterId}` }}
									</div>
									<div class="order-sub">
										{{ formatDatePretty(o.bookingDate) }}
									</div>
								</div>

								<span class="badge-pill" :class="statusBadgeClass(o.status)">
									{{ statusLabel(o.status) }}
								</span>
							</div>

							<div class="order-meta">
								<div class="meta-item">
									<!-- clock -->
									<svg class="meta-ic" viewBox="0 0 24 24" fill="none">
										<path
											d="M12 8v5l3 2"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
										<path
											d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
											stroke="currentColor"
											stroke-width="2"
										/>
									</svg>
									{{ o.startTime }}
								</div>

								<div class="meta-item">
									<!-- wallet -->
									<svg class="meta-ic" viewBox="0 0 24 24" fill="none">
										<path
											d="M21 8V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1"
											stroke="currentColor"
											stroke-width="2"
											stroke-linejoin="round"
										/>
										<path
											d="M21 10h-6a2 2 0 0 0 0 4h6v-4Z"
											stroke="currentColor"
											stroke-width="2"
											stroke-linejoin="round"
										/>
									</svg>
									{{ o.price.toLocaleString() }} сум
								</div>
							</div>

							<div v-if="o.comment" class="comment">
								{{ o.comment }}
							</div>
						</button>
					</div>
				</div>

				<!-- Past -->
				<div v-if="pastOrders.length > 0" class="section">
					<div class="section-title muted">
						<span class="mini-ic" aria-hidden="true">
							<!-- history -->
							<svg viewBox="0 0 24 24" fill="none">
								<path
									d="M3 12a9 9 0 1 0 3-6.7"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
								/>
								<path
									d="M3 3v6h6"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
								<path
									d="M12 7v5l3 2"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</span>
						Прошедшие
					</div>

					<div class="list">
						<button
							v-for="o in pastOrders"
							:key="o.id"
							type="button"
							class="order-card past"
							@click="viewOrder(o.id)"
						>
							<div class="order-head">
								<div class="order-main">
									<div class="order-name">
										{{ o.masterName || `Мастер #${o.masterId}` }}
									</div>
									<div class="order-sub">
										{{ formatDatePretty(o.bookingDate) }} · {{ o.startTime }}
									</div>
								</div>

								<span class="badge-pill" :class="statusBadgeClass(o.status)">
									{{ statusLabel(o.status) }}
								</span>
							</div>

							<div class="order-meta">
								<div class="meta-item">{{ o.price.toLocaleString() }} сум</div>
							</div>
						</button>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>

<style scoped>
.client-history-page {
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

/* Buttons */
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
		box-shadow 0.15s ease,
		opacity 0.15s ease;
}
.icon-btn:hover {
	transform: translateY(-1px);
	box-shadow: 0 10px 22px rgba(0, 0, 0, 0.1);
}
.icon-btn:active {
	transform: translateY(0);
}
.icon-btn:disabled {
	opacity: 0.55;
	cursor: not-allowed;
	transform: none !important;
	box-shadow: none !important;
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

/* Sections */
.section {
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.section-title {
	display: flex;
	gap: 8px;
	align-items: center;
	font-size: 13px;
	font-weight: 900;
	color: #0f172a;
	letter-spacing: -0.2px;
	padding: 4px 2px 0;
}
.section-title.muted {
	color: rgba(15, 23, 42, 0.6);
}

.list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

/* Order card */
.order-card {
	text-align: left;
	width: 100%;
	border: none;
	cursor: pointer;
	padding: 14px;
	border-radius: 18px;
	background: rgba(255, 255, 255, 0.78);
	border: 1px solid rgba(255, 255, 255, 0.55);
	backdrop-filter: blur(14px);
	-webkit-backdrop-filter: blur(14px);
	box-shadow:
		0 12px 34px rgba(0, 0, 0, 0.1),
		inset 0 1px 0 rgba(255, 255, 255, 0.55);
	transition:
		transform 0.15s ease,
		box-shadow 0.15s ease,
		opacity 0.15s ease;
}
.order-card:hover {
	transform: translateY(-1px);
	box-shadow:
		0 16px 40px rgba(0, 0, 0, 0.14),
		inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.order-card:active {
	transform: translateY(0);
}

.order-card.upcoming {
	border: 1px solid rgba(59, 130, 246, 0.2);
	box-shadow:
		0 12px 34px rgba(59, 130, 246, 0.08),
		0 12px 34px rgba(0, 0, 0, 0.08),
		inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.order-card.past {
	opacity: 0.78;
}

.order-head {
	display: flex;
	justify-content: space-between;
	gap: 10px;
	align-items: flex-start;
}
.order-main {
	min-width: 0;
}
.order-name {
	font-size: 15px;
	font-weight: 900;
	color: #0f172a;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.order-sub {
	margin-top: 4px;
	font-size: 12px;
	font-weight: 700;
	color: rgba(15, 23, 42, 0.55);
}

/* badge */
.badge-pill {
	display: inline-block;
	font-size: 12px;
	font-weight: 900;
	padding: 6px 10px;
	border-radius: 999px;
	white-space: nowrap;
}

/* meta */
.order-meta {
	display: flex;
	gap: 14px;
	align-items: center;
	margin-top: 10px;
	font-size: 12px;
	font-weight: 800;
	color: rgba(15, 23, 42, 0.7);
}
.meta-item {
	display: flex;
	align-items: center;
	gap: 6px;
}
.meta-ic {
	width: 16px;
	height: 16px;
	color: rgba(15, 23, 42, 0.55);
}

/* comment */
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

/* Empty */
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
.empty-ic svg {
	width: 26px;
	height: 26px;
}
.empty-title {
	font-size: 16px;
	font-weight: 900;
	color: #0f172a;
}
.empty-subtitle {
	font-size: 12px;
	font-weight: 700;
	color: rgba(15, 23, 42, 0.55);
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

/* Error sheet */
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
	transition:
		transform 0.15s ease,
		box-shadow 0.15s ease;
}
.primary-btn:hover {
	transform: translateY(-1px);
	box-shadow: 0 14px 28px rgba(102, 126, 234, 0.34);
}
.primary-btn:active {
	transform: translateY(0);
}

/* Skeleton */
.skeleton-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.skeleton-card {
	padding: 14px;
	border-radius: 18px;
	background: rgba(15, 23, 42, 0.03);
	border: 1px solid rgba(15, 23, 42, 0.06);
}
.skeleton-line {
	height: 12px;
	border-radius: 999px;
	background: rgba(15, 23, 42, 0.08);
	animation: pulse 1.2s ease-in-out infinite;
	margin: 8px 0;
}
.skeleton-row {
	display: flex;
	gap: 10px;
	margin-top: 10px;
}
.skeleton-pill {
	height: 28px;
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
.w-30 {
	width: 30%;
}
.w-25 {
	width: 25%;
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
</style>
