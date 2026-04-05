import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin((nuxtApp) => {
  // @ts-expect-error — $pinia is injected by @pinia/nuxt
  nuxtApp.$pinia.use(piniaPluginPersistedstate)
})
