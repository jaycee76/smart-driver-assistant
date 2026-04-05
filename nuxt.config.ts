import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  ssr: false,
  future: {
    compatibilityVersion: 4,
  },
  vite: {
    plugins: [tailwindcss()],
  },
  css: ['~/assets/css/main.css'],
  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt',
  ],
  runtimeConfig: {
    geminiApiKey: '',
    orsApiKey: '',
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en-PH' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'currency', content: 'PHP' },
        { name: 'description', content: 'Smart Driver Assistant for Filipino drivers' },
      ],
      title: 'Smart Driver Assistant',
      script: [
        {
          // Runs synchronously before paint — applies dark class from persisted settings
          // to prevent flash of wrong theme on page refresh.
          // pinia-plugin-persistedstate stores state under the store id key ('settings').
          // Default darkMode is true, so add 'dark' unless explicitly set to false.
          innerHTML: `try{var s=JSON.parse(localStorage.getItem('settings')||'{}');if(s.darkMode!==false)document.documentElement.classList.add('dark')}catch(e){}`,
        },
      ],
    },
  },
})
