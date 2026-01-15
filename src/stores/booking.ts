import { defineStore } from "pinia"

export type BookingDraft = {
  masterId: number | null
  date: string | null
  time: string | null
  durationMin: number
  price: number

  clientName: string
  clientPhone: string
  comment: string
}

export const useBookingStore = defineStore("booking", {
  state: (): BookingDraft => ({
    masterId: null,
    date: null,
    time: null,
    durationMin: 60,
    price: 50000,

    clientName: "",
    clientPhone: "",
    comment: ""
  }),

  actions: {
    setMaster(id: number) {
      this.masterId = id
      this.date = null
      this.time = null
    },
    setDate(date: string) {
      this.date = date
      this.time = null
    },
    setTime(time: string) {
      this.time = time
    },
    setClient(name: string, phone: string) {
      this.clientName = name
      this.clientPhone = phone
    },
    setComment(comment: string) {
      this.comment = comment
    },
    reset() {
      this.masterId = null
      this.date = null
      this.time = null
      this.clientName = ""
      this.clientPhone = ""
      this.comment = ""
    }
  }
})
