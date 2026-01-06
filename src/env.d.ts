declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '@vue-leaflet/vue-leaflet' {
  export const LMap: any
  export const LTileLayer: any
  export const LMarker: any
  export const LPopup: any
}