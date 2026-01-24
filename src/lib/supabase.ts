import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Типы для TypeScript (автогенерация позже)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: number
          telegram_id: number
          first_name: string | null
          role: 'client' | 'master' | 'admin'
          phone: string | null
          created_at: string
        }
        Insert: {
          telegram_id: number
          first_name?: string | null
          role?: 'client' | 'master' | 'admin'
          phone?: string | null
        }
        Update: {
          first_name?: string | null
          phone?: string | null
          role?: 'client' | 'master' | 'admin'
        }
      }
      masters: {
        Row: {
          id: number
          user_id: number
          name: string
          address: string
          lat: number
          lng: number
          rating: number
          reviews_count: number
          price_30min: number
          price_60min: number
          is_active: boolean
          photo_url: string | null
          bio: string | null
        }
      }
      orders: {
        Row: {
          id: number
          client_id: number
          master_id: number
          booking_date: string
          start_time: string
          duration_minutes: number
          status: string
          price: number
          client_name: string
          client_phone: string
          comment: string | null
          created_at: string
        }
        Insert: {
          client_id: number
          master_id: number
          booking_date: string
          start_time: string
          duration_minutes: number
          price: number
          client_name: string
          client_phone: string
          comment?: string | null
        }
      }
    }
  }
}