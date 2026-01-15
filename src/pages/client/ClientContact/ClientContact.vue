<script setup lang="ts">
import { computed, ref } from "vue"
import { useRouter } from "vue-router"
import { useBookingStore } from "@/stores/booking"
import BackButton from "@/components/BackButton.vue"

const router = useRouter()
const booking = useBookingStore()

// если пользователь открыл страницу напрямую без выбора мастера/даты/времени
const isFlowValid = computed(() => !!(booking.masterId && booking.date && booking.time))

const name = ref(booking.clientName)
const phone = ref(booking.clientPhone)
const comment = ref(booking.comment)

const nameError = ref("")
const phoneError = ref("")

function normalizePhone(value: string) {
  // оставляем цифры и +
  return value.replace(/[^\d+]/g, "")
}

function validate() {
  nameError.value = ""
  phoneError.value = ""

  if (!name.value.trim()) nameError.value = "Введите имя"
  if (!phone.value.trim()) phoneError.value = "Введите номер"

  // лёгкая проверка на длину (можешь поменять)
  const digits = phone.value.replace(/[^\d]/g, "")
  if (!phoneError.value && digits.length < 9) phoneError.value = "Номер слишком короткий"

  return !nameError.value && !phoneError.value
}

function goBack() {
  // назад на выбор времени
  if (window.history.length > 1) router.back()
  else if (booking.masterId && booking.date) {
    router.replace({ name: "ClientTime", params: { id: booking.masterId }, query: { date: booking.date } })
  } else {
    router.replace({ name: "ClientMap" })
  }
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
</script>

<template>
  <div class="p-4 space-y-4">
    <BackButton @click="goBack" />

    <div class="rounded-2xl bg-white p-4 shadow">
      <h1 class="text-xl font-bold">Ваши данные</h1>
      <p class="text-sm text-gray-500">Имя и номер обязательны</p>

      <div v-if="!isFlowValid" class="mt-3 text-sm text-red-600">
        Сначала выберите мастера, день и время.
      </div>

      <div class="mt-4 space-y-3">
        <div>
          <label class="text-sm text-gray-600">Имя *</label>
          <input
            v-model="name"
            type="text"
            class="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-black"
            placeholder="Например: Aziz"
          />
          <div v-if="nameError" class="mt-1 text-xs text-red-600">{{ nameError }}</div>
        </div>

        <div>
          <label class="text-sm text-gray-600">Номер *</label>
          <input
            v-model="phone"
            type="tel"
            class="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-black"
            placeholder="+998 90 123 45 67"
          />
          <div v-if="phoneError" class="mt-1 text-xs text-red-600">{{ phoneError }}</div>
        </div>

        <div>
          <label class="text-sm text-gray-600">Комментарий (опционально)</label>
          <textarea
            v-model="comment"
            rows="3"
            class="mt-1 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-black"
            placeholder="Например: хочу фейд, без бороды"
          />
        </div>
      </div>

      <button
        type="button"
        class="mt-4 w-full rounded-xl bg-black p-3 text-white hover:opacity-95"
        @click="continueToCheckout"
      >
        Продолжить
      </button>
    </div>
  </div>
</template>
