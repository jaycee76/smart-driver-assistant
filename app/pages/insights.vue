<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFuelStore } from '~/stores/fuel'

const fuelStore = useFuelStore()

const insight = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)

const activeVehicle = computed(() => fuelStore.activeVehicle)
const hasLogs = computed(() => fuelStore.fuelLogs.length > 0)

async function analyzeData() {
  if (!activeVehicle.value) return
  isLoading.value = true
  error.value = null
  insight.value = ''

  try {
    const result = await $fetch<{ insight: string }>('/api/ai-insight', {
      method: 'POST',
      body: {
        fuelLogs: fuelStore.fuelLogs.slice(0, 20),
        vehicle: activeVehicle.value,
      },
    })
    insight.value = result.insight
  } catch {
    error.value = 'Could not generate insight. Make sure NUXT_GEMINI_API_KEY is set in your .env file.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-8 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-2">Get Driving Insights</h1>
    <p class="text-sm text-gray-400 mb-6">Get personalized tips based on your fuel data, powered by Google's Gemma AI.</p>

    <!-- No vehicle state -->
    <div v-if="!activeVehicle" class="text-center py-16">
      <h2 class="text-lg font-semibold mb-2">No Vehicle Added</h2>
      <p class="text-gray-400 text-sm mb-6">Add a vehicle first to get personalized fuel insights.</p>
      <NuxtLink to="/" class="bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl">
        Go to Dashboard
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Vehicle info card -->
      <div class="bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-surface-700 mb-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase mb-1">Analyzing</p>
            <p class="font-semibold">{{ activeVehicle.name }} ({{ activeVehicle.year }})</p>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ fuelStore.fuelLogs.length }} log {{ fuelStore.fuelLogs.length === 1 ? 'entry' : 'entries' }}
            </p>
          </div>
        </div>
      </div>

      <!-- No logs warning -->
      <div
        v-if="!hasLogs"
        class="bg-accent-50 dark:bg-accent-900/20 border border-accent-100 dark:border-accent-900/30 rounded-xl px-4 py-3 text-sm text-accent-600 dark:text-accent-400 mb-4"
      >
        Log at least one fill-up to get a meaningful insight.
      </div>

      <button
        class="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl mb-6 transition-colors disabled:opacity-50"
        :disabled="isLoading || !hasLogs"
        @click="analyzeData"
      >
        {{ isLoading ? 'Analyzing your data…' : 'Analyze My Fuel Data' }}
      </button>

      <p v-if="error" class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 mb-4">
        {{ error }}
      </p>

      <InsightCard v-if="isLoading || insight" :text="insight" :is-loading="isLoading" />
    </template>
  </div>
</template>
