import { supabase } from '@/lib/supabase'
import type { Master } from '@/types/master'

export async function getMastersNearby(
  lat: number = 41.3289,
  lng: number = 69.2482,
  radius: number = 10
): Promise<Master[]> {
  const { data, error } = await supabase.rpc('get_nearby_masters', {
    user_lat: lat,
    user_lng: lng,
    radius_km: radius
  })
  
  if (error) {
    console.error('Error fetching masters:', error)
    return []
  }
  
  return data as Master[]
}

export async function getMasterById(id: number): Promise<Master | null> {
  const { data, error } = await supabase
    .from('masters')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching master:', error)
    return null
  }
  
  return data as Master
}