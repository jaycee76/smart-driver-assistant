<script setup lang="ts">
import { watchEffect } from 'vue'
import { useSettingsStore } from '~/stores/settings'

const settings = useSettingsStore()

const navItems = [
  { label: 'Dashboard', to: '/', icon: '🏠' },
  { label: 'Fuel Log', to: '/fuel-log', icon: '⛽' },
  { label: 'Calculator', to: '/calculator', icon: '🧮' },
  { label: 'Journey Planner', to: '/planner', icon: '🗺️' },
  { label: 'Insights', to: '/insights', icon: '💡' },
]

function toggleDark() {
  settings.darkMode = !settings.darkMode
}

// Apply dark class to <html>
watchEffect(() => {
  if (import.meta.client) {
    document.documentElement.classList.toggle('dark', settings.darkMode)
  }
})
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-surface-950 text-gray-900 dark:text-gray-100 flex">
    <!-- Sidebar (desktop) -->
    <aside class="hidden md:flex flex-col w-60 min-h-screen bg-surface-900 text-white p-4 gap-2 fixed top-0 left-0">
      <div class="text-xl font-bold mb-6 px-2">Smart Driver Assistant</div>
      <nav class="flex flex-col gap-1 flex-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
          active-class="bg-primary-600 text-white"
          exact-active-class="bg-primary-600 text-white"
        >
          <span>{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
      <button
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
        @click="toggleDark"
      >
        <span>{{ settings.darkMode ? '☀️' : '🌙' }}</span>
        <span>{{ settings.darkMode ? 'Light mode' : 'Dark mode' }}</span>
      </button>
    </aside>

    <!-- Main content -->
    <main class="flex-1 md:ml-60 pb-20 md:pb-0">
      <!-- Mobile top bar -->
      <div class="md:hidden flex items-center justify-between px-4 py-3 bg-surface-900 text-white">
        <span class="text-sm font-bold">Smart Driver Assistant</span>
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <span class="text-xs text-surface-300">{{ settings.darkMode ? '🌙' : '☀️' }}</span>
          <button
            role="switch"
            :aria-checked="settings.darkMode"
            class="relative w-10 h-6 rounded-full transition-colors"
            :class="settings.darkMode ? 'bg-primary-600' : 'bg-surface-600'"
            @click="toggleDark"
          >
            <span
              class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
              :class="settings.darkMode ? 'translate-x-4' : 'translate-x-0'"
            />
          </button>
        </label>
      </div>
      <slot />
    </main>

    <!-- Bottom nav (mobile) -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-surface-900 text-white flex border-t border-surface-700 z-50">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center justify-center flex-1 py-2 text-xs text-surface-300 hover:text-white transition-colors"
        active-class="text-primary-400"
        exact-active-class="text-primary-400"
      >
        <span class="text-lg">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>
