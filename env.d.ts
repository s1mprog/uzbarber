/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Типы для vue3-leaflet (или @vue-leaflet)
declare module '@vue-leaflet/vue-leaflet' {
  export const LMap: any
  export const LTileLayer: any
  export const LMarker: any
  export const LPopup: any
}

// Типы для ImportMeta (для import.meta.env)
interface ImportMetaEnv {
  readonly BASE_URL: string
  // Добавь другие переменные окружения, если используешь (например, VITE_API_URL: string)
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}