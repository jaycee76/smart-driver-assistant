<script setup lang="ts">
import { ref, watch, watchEffect, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSettingsStore } from '~/stores/settings'

const settings = useSettingsStore()
const route = useRoute()
const drawerOpen = ref(false)

// Close mobile drawer on route change
watch(() => route.path, () => {
  drawerOpen.value = false
})

// Lock body scroll when drawer is open
watch(drawerOpen, (val) => {
  if (import.meta.client) {
    document.body.classList.toggle('overflow-hidden', val)
  }
})

// Apply dark class to <html>
watchEffect(() => {
  if (import.meta.client) {
    document.documentElement.classList.toggle('dark', settings.darkMode)
  }
})

// Clean up scroll lock if component is unmounted while drawer is open
onUnmounted(() => {
  if (import.meta.client) {
    document.body.classList.remove('overflow-hidden')
  }
})

const navItems = [
  { label: 'Dashboard', to: '/', icon: '🏠' },
  { label: 'Fuel Log', to: '/fuel-log', icon: '⛽' },
  { label: 'Toll Calculator', to: '/toll-calculator', icon: '🛣️' },
  { label: 'Journey Cost Calculator', to: '/journey-cost-calculator', icon: '🗺️' },
  { label: 'Insights', to: '/insights', icon: '💡' },
  { label: 'Settings', to: '/settings', icon: '⚙️' },
]
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-surface-950 text-gray-900 dark:text-gray-100 flex overflow-x-hidden">
    <!-- Desktop sidebar (md and above) -->
    <aside
      class="group hidden md:flex flex-col w-16 hover:w-56 min-h-screen fixed top-0 left-0 z-40 overflow-hidden transition-[width] duration-300 ease-in-out"
      style="background: rgba(15,23,42,0.75); backdrop-filter: blur(16px); border-right: 1px solid rgba(255,255,255,0.08);"
    >
      <!-- Logo -->
      <div class="flex items-center py-5 shrink-0">
        <div class="w-16 flex items-center justify-center shrink-0">
          <div class="w-8 h-8 rounded-lg overflow-hidden bg-white p-0.5">
            <img src="/images/litro-logo.png" alt="Litro.ph" class="w-full h-full object-contain" />
          </div>
        </div>
        <span class="text-xl font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100 pr-4">Litro.ph</span>
      </div>

      <!-- Nav links -->
      <nav class="flex flex-col gap-1 flex-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center py-2.5 rounded-lg text-sm font-medium text-surface-300 hover:text-white transition-colors whitespace-nowrap"
          exact-active-class="nav-link-active"
        >
          <span class="text-lg shrink-0 w-16 flex items-center justify-center">{{ item.icon }}</span>
          <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100 pr-4">{{ item.label }}</span>
        </NuxtLink>
      </nav>
    </aside>

    <!-- Main content -->
    <main class="flex-1 md:ml-16 min-h-screen flex flex-col min-w-0">
      <!-- Mobile top bar -->
      <div
        class="md:hidden flex items-center px-4 py-3"
        style="background: rgba(15,23,42,0.75); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.08);"
      >
        <button
          class="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
          aria-label="Open navigation"
          @click="drawerOpen = true"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      <div class="flex-1">
        <slot />
      </div>

      <footer class="px-4 py-4 md:px-8 text-center border-t border-gray-200 dark:border-surface-800">
        <p class="text-sm text-gray-500 dark:text-surface-300">
          A project by:
          <a
            href="https://jcajasmin.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-primary-600 dark:text-primary-400 hover:underline ml-1"
          >
            John Christopher Jasmin
          </a>
        </p>
      </footer>
    </main>

    <!-- Mobile drawer backdrop -->
    <Transition name="fade">
      <div
        v-if="drawerOpen"
        class="md:hidden fixed inset-0 z-40"
        style="background: rgba(0,0,0,0.4);"
        @click="drawerOpen = false"
      />
    </Transition>

    <!-- Mobile slide-in drawer -->
    <Transition name="slide">
      <div
        v-if="drawerOpen"
        class="md:hidden fixed top-0 left-0 h-full w-72 z-50 flex flex-col"
        style="background: rgba(15,23,42,0.9); backdrop-filter: blur(16px); border-right: 1px solid rgba(255,255,255,0.08);"
      >
        <!-- Drawer header -->
        <div
          class="flex items-center justify-between px-4 py-5"
          style="border-bottom: 1px solid rgba(255,255,255,0.08);"
        >
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-md overflow-hidden bg-white p-0.5 shrink-0">
              <img src="/images/litro-logo.png" alt="Litro.ph" class="w-full h-full object-contain" />
            </div>
            <span class="font-bold text-white">Litro.ph</span>
          </div>
          <button
            class="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close navigation"
            @click="drawerOpen = false"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Drawer nav links -->
        <nav class="flex flex-col gap-1 flex-1 p-3">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-surface-300 hover:text-white transition-colors"
            exact-active-class="nav-link-active"
          >
            <span class="text-lg">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Glass pill for active nav links */
.nav-link-active {
  background: rgba(99, 102, 241, 0.35);
  border: 1px solid rgba(99, 102, 241, 0.5);
  color: white;
}

/* Backdrop fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 300ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Drawer slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: transform 300ms ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
