export interface Master {
  id: number
  name: string
  lat: number  // Широта
  lng: number  // Долгота
  address: string
  phone?: string  // Опционально: телефон
  services?: string[]  // Опционально: массив услуг (например, ['стрижка', 'окраска'])
  rating?: number  // Опционально: рейтинг
}