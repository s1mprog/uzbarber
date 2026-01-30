<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { getMasterById, createOrder } from '@/api/client'
import { getCurrentUserId } from '@/api/auth'
import { notifyMasterNewOrder } from '@/api/telegram'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const booking = useBookingStore()

const master = ref<any>(null)
const loading = ref(false)
const loadingMaster = ref(false)
const error = ref('')

const canPay = computed(() => {
	return !!(
		booking.masterId &&
		booking.date &&
		booking.time &&
		booking.clientName &&
		booking.clientPhone
	)
})

function pad(n: number) {
	return String(n).padStart(2, '0')
}

function addMinutes(time: string, minutesToAdd: number) {
	const parts = time.split(':')
	const hh = Number(parts[0] ?? 0)
	const mm = Number(parts[1] ?? 0)
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) return time

	const total = (hh * 60 + mm + minutesToAdd) % (24 * 60)
	const h2 = Math.floor(total / 60)
	const m2 = total % 60
	return `${pad(h2)}:${pad(m2)}`
}

const endTime = computed(() => {
	if (!booking.time) return ''
	return addMinutes(booking.time, booking.durationMin || 60)
})

const prettyDate = computed(() => {
	const raw = booking.date
	if (!raw) return '—'
	const d = new Date(raw + 'T00:00:00')
	if (Number.isNaN(d.getTime())) return raw
	return d.toLocaleDateString('ru-RU', {
		weekday: 'short',
		day: '2-digit',
		month: 'long',
	})
})

async function loadMaster() {
	if (!booking.masterId) return
	loadingMaster.value = true
	try {
		master.value = await getMasterById(booking.masterId)
	} catch (e) {
		console.error(e)
		master.value = null
	} finally {
		loadingMaster.value = false
	}
}

onMounted(async () => {
	if (!canPay.value) {
		router.replace({ name: 'ClientContact' })
		return
	}
	await loadMaster()
})

async function createBooking() {
	if (!canPay.value || loading.value) return

	try {
		loading.value = true
		error.value = ''

		const clientId = await getCurrentUserId()

		const order = await createOrder({
			clientId,
			masterId: booking.masterId!,
			bookingDate: booking.date!,
			startTime: booking.time!,
			durationMinutes: booking.durationMin,
			clientName: booking.clientName,
			clientPhone: booking.clientPhone,
			comment: booking.comment || undefined,
			price: booking.price,
		})

		// уведомление мастеру (не критично, если упадёт)
		try {
			const { data: masterData } = await supabase
				.from('masters')
				.select(
					`
          id,
          name,
          users!masters_user_id_fkey(telegram_chat_id)
        `,
				)
				.eq('id', booking.masterId!)
				.single()

			const masterChatId =
				(masterData?.users as any)?.[0]?.telegram_chat_id ||
				(masterData?.users as any)?.telegram_chat_id

			if (masterChatId) {
				await notifyMasterNewOrder({
					masterChatId,
					clientName: booking.clientName,
					clientPhone: booking.clientPhone,
					bookingDate: booking.date!,
					startTime: booking.time!,
					comment: booking.comment,
					price: booking.price,
				})
			}
		} catch (notifyError) {
			console.error('Failed to send notification:', notifyError)
		}

		booking.reset()

		router.push({
			name: 'ClientStatus',
			params: { bookingId: order.id },
		})
	} catch (err: any) {
		console.error('Error creating order:', err)
		error.value = err?.message || 'Не удалось создать заказ'
	} finally {
		loading.value = false
	}
}

function goBack() {
	const id = booking.masterId
	const date = booking.date

	if (window.history.length > 1) {
		router.back()
		return
	}

	if (id && date)
		router.replace({ name: 'ClientTime', params: { id }, query: { date } })
	else if (id) router.replace({ name: 'ClientMaster', params: { id } })
	else router.replace({ name: 'ClientMap' })
}

function retry() {
	error.value = ''
	createBooking()
}
</script>

<template>
	<div class="client-checkout-page">
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
							<!-- check-circle -->
							<svg viewBox="0 0 24 24" fill="none">
								<path
									d="M9 12l2 2 4-4"
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
						Подтверждение
					</div>
					<div class="topbar-subtitle">Проверьте детали перед отправкой</div>
				</div>

				<button
					class="icon-btn"
					type="button"
					@click="loadMaster"
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
			<!-- Summary -->
			<div class="glass-card">
				<div class="card-title">
					<span class="mini-ic" aria-hidden="true">
						<!-- clipboard -->
						<svg viewBox="0 0 24 24" fill="none">
							<path
								d="M9 5h6"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
							<path
								d="M9 3h6a2 2 0 0 1 2 2v16H7V5a2 2 0 0 1 2-2Z"
								stroke="currentColor"
								stroke-width="2"
								stroke-linejoin="round"
							/>
							<path
								d="M9 8h6M9 12h6M9 16h6"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
						</svg>
					</span>
					Детали записи
				</div>

				<div class="rows">
					<div class="row">
						<span class="label">
							<span class="mini-ic sub" aria-hidden="true">
								<!-- scissors -->
								<svg viewBox="0 0 24 24" fill="none">
									<path
										d="M4 8a3 3 0 1 0 0 .01V8Z"
										stroke="currentColor"
										stroke-width="2"
									/>
									<path
										d="M4 16a3 3 0 1 0 0 .01V16Z"
										stroke="currentColor"
										stroke-width="2"
									/>
									<path
										d="M7 8l14-6M7 16l14 6"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
									/>
								</svg>
							</span>
							Барбер
						</span>
						<b class="value">
							<span v-if="loadingMaster" class="skeleton-line w-40"></span>
							<span v-else>{{ master?.name || '—' }}</span>
						</b>
					</div>

					<div class="row">
						<span class="label">
							<span class="mini-ic sub" aria-hidden="true">
								<!-- calendar -->
								<svg viewBox="0 0 24 24" fill="none">
									<path
										d="M7 3v3M17 3v3"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
									/>
									<path
										d="M4 7h16"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
									/>
									<path
										d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
										stroke="currentColor"
										stroke-width="2"
										stroke-linejoin="round"
									/>
								</svg>
							</span>
							Дата
						</span>
						<b class="value">{{ prettyDate }}</b>
					</div>

					<div class="row">
						<span class="label">
							<span class="mini-ic sub" aria-hidden="true">
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
							Время
						</span>
						<b class="value">{{ booking.time }} – {{ endTime }}</b>
					</div>

					<div class="row">
						<span class="label">
							<span class="mini-ic sub" aria-hidden="true">
								<!-- map-pin -->
								<svg viewBox="0 0 24 24" fill="none">
									<path
										d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
										stroke="currentColor"
										stroke-width="2"
									/>
									<path
										d="M12 10a2 2 0 1 0-2-2 2 2 0 0 0 2 2Z"
										stroke="currentColor"
										stroke-width="2"
									/>
								</svg>
							</span>
							Адрес
						</span>
						<b class="value right">{{ master?.address || '—' }}</b>
					</div>

					<div class="divider"></div>

					<div class="row">
						<span class="label">
							<span class="mini-ic sub" aria-hidden="true">
								<!-- user -->
								<svg viewBox="0 0 24 24" fill="none">
									<path
										d="M20 21a8 8 0 0 0-16 0"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
									/>
									<path
										d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
										stroke="currentColor"
										stroke-width="2"
									/>
								</svg>
							</span>
							Имя
						</span>
						<b class="value">{{ booking.clientName }}</b>
					</div>

					<div class="row">
						<span class="label">
							<span class="mini-ic sub" aria-hidden="true">
								<!-- phone -->
								<svg viewBox="0 0 24 24" fill="none">
									<path
										d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9Z"
										stroke="currentColor"
										stroke-width="2"
										stroke-linejoin="round"
									/>
								</svg>
							</span>
							Телефон
						</span>
						<b class="value">{{ booking.clientPhone }}</b>
					</div>

					<div v-if="booking.comment" class="row">
						<span class="label">
							<span class="mini-ic sub" aria-hidden="true">
								<!-- message -->
								<svg viewBox="0 0 24 24" fill="none">
									<path
										d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"
										stroke="currentColor"
										stroke-width="2"
										stroke-linejoin="round"
									/>
								</svg>
							</span>
							Комментарий
						</span>
						<b class="value right">{{ booking.comment }}</b>
					</div>

					<div class="divider"></div>

					<div class="row total">
						<span class="label">
							<span class="mini-ic sub" aria-hidden="true">
								<!-- wallet -->
								<svg viewBox="0 0 24 24" fill="none">
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
							</span>
							Сумма
						</span>
						<b class="value">{{ booking.price.toLocaleString() }} сум</b>
					</div>

					<div class="note">
						После подтверждения заказ уйдёт мастеру. Вы получите обновление,
						когда мастер примет запись.
					</div>
					<div class="note">Отмена бесплатно за 2 часа до записи.</div>
				</div>
			</div>

			<!-- Error sheet -->
			<div v-if="error" class="sheet">
				<div class="sheet-card">
					<div class="sheet-icon error">⚠️</div>
					<div class="sheet-text">
						<p class="sheet-title">Не удалось создать заказ</p>
						<p class="sheet-subtitle">{{ error }}</p>
					</div>
					<button class="primary-btn" type="button" @click="retry">
						Повторить
					</button>
				</div>
			</div>

			<!-- Confirm button -->
			<button
				class="primary-wide"
				:disabled="loading || !canPay"
				@click="createBooking"
			>
				<span v-if="loading">Создание заказа...</span>
				<span v-else>Подтвердить бронирование</span>
			</button>
		</div>
	</div>
</template>

<style scoped>
.client-checkout-page {
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
.mini-ic.sub {
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
	display: flex;
	gap: 8px;
	align-items: center;
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

.note {
	font-size: 12px;
	font-weight: 700;
	color: rgba(15, 23, 42, 0.55);
	line-height: 1.25;
	margin-top: 2px;
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
		box-shadow 0.15s ease,
		opacity 0.15s ease;
}
.primary-wide:hover {
	transform: translateY(-1px);
	box-shadow: 0 18px 34px rgba(102, 126, 234, 0.34);
}
.primary-wide:active {
	transform: translateY(0);
}
.primary-wide:disabled {
	cursor: not-allowed;
	opacity: 0.55;
	transform: none !important;
	box-shadow: none !important;
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

.skeleton-line {
	display: inline-block;
	height: 14px;
	border-radius: 999px;
	background: rgba(15, 23, 42, 0.08);
	animation: pulse 1.2s ease-in-out infinite;
	vertical-align: middle;
}
.w-40 {
	width: 140px;
	max-width: 45vw;
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
