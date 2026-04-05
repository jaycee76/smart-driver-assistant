<script setup lang="ts">
import { ref, watch } from 'vue'
import type { RouteResult, GeocodeFeature, TollEstimate } from '~/types'
import { useFuelStore } from '~/stores/fuel'

const fuelStore = useFuelStore()
const noVehicleWarning = ref(false)

const originQuery = ref('')
const destQuery = ref('')
const originResults = ref<GeocodeFeature[]>([])
const destResults = ref<GeocodeFeature[]>([])
const origin = ref<GeocodeFeature | null>(null)
const destination = ref<GeocodeFeature | null>(null)
const route = ref<RouteResult | null>(null)
const isLoadingRoute = ref(false)
const routeError = ref<string | null>(null)
const isSearchingOrigin = ref(false)
const isSearchingDest = ref(false)

const avoidTolls = ref(false)
const tollEstimate = ref<TollEstimate | null>(null)
const tollHighlight = ref(false)

watch(avoidTolls, () => {
  tollEstimate.value = null
  tollHighlight.value = false
})

let searchTimeout: ReturnType<typeof setTimeout> | null = null

async function searchPlace(query: string, target: 'origin' | 'dest') {
  if (!query.trim()) {
    if (target === 'origin') originResults.value = []
    else destResults.value = []
    return
  }
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    if (target === 'origin') isSearchingOrigin.value = true
    else isSearchingDest.value = true
    try {
      const results = await $fetch<{ features: GeocodeFeature[] }>(
        `/api/geocode?q=${encodeURIComponent(query)}`,
      )
      if (target === 'origin') originResults.value = results.features
      else destResults.value = results.features
    } finally {
      if (target === 'origin') isSearchingOrigin.value = false
      else isSearchingDest.value = false
    }
  }, 400)
}

function selectPlace(feature: GeocodeFeature, target: 'origin' | 'dest') {
  if (target === 'origin') {
    origin.value = feature
    originQuery.value = feature.label
    originResults.value = []
  } else {
    destination.value = feature
    destQuery.value = feature.label
    destResults.value = []
  }
}

async function planRoute() {
  if (!origin.value || !destination.value) return

  if (fuelStore.vehicles.length === 0) {
    noVehicleWarning.value = true
    return
  }
  noVehicleWarning.value = false

  if (!avoidTolls.value && !tollEstimate.value) {
    tollHighlight.value = true
    document.querySelector('.toll-selector')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  tollHighlight.value = false
  isLoadingRoute.value = true
  routeError.value = null
  route.value = null

  try {
    route.value = await $fetch<RouteResult>('/api/route', {
      method: 'POST',
      body: {
        origin: origin.value.coordinates,
        destination: destination.value.coordinates,
        avoidTolls: avoidTolls.value,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    routeError.value = msg.includes('ORS') || msg.includes('API') ? msg : `Route calculation failed: ${msg}`
  } finally {
    isLoadingRoute.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-8 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Journey Planner</h1>

    <div class="space-y-4">
      <!-- Origin search -->
      <div class="relative">
        <label class="label">Origin</label>
        <input
          v-model="originQuery"
          type="text"
          placeholder="Search origin…"
          class="input-field w-full"
          @input="searchPlace(originQuery, 'origin')"
        />
        <div
          v-if="originResults.length"
          class="absolute z-10 w-full mt-1 border border-gray-200 dark:border-surface-600 bg-white dark:bg-surface-800 rounded-xl shadow-lg overflow-hidden"
        >
          <button
            v-for="r in originResults"
            :key="r.label"
            class="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-surface-700 border-b border-gray-50 dark:border-surface-700 last:border-0"
            @click="selectPlace(r, 'origin')"
          >
            {{ r.label }}
          </button>
        </div>
      </div>

      <!-- Destination search -->
      <div class="relative">
        <label class="label">Destination</label>
        <input
          v-model="destQuery"
          type="text"
          placeholder="Search destination…"
          class="input-field w-full"
          @input="searchPlace(destQuery, 'dest')"
        />
        <div
          v-if="destResults.length"
          class="absolute z-10 w-full mt-1 border border-gray-200 dark:border-surface-600 bg-white dark:bg-surface-800 rounded-xl shadow-lg overflow-hidden"
        >
          <button
            v-for="r in destResults"
            :key="r.label"
            class="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-surface-700 border-b border-gray-50 dark:border-surface-700 last:border-0"
            @click="selectPlace(r, 'dest')"
          >
            {{ r.label }}
          </button>
        </div>
      </div>

      <!-- Avoid tolls toggle -->
      <label class="flex items-center gap-3 cursor-pointer select-none">
        <button
          role="switch"
          :aria-checked="avoidTolls"
          class="relative w-10 h-6 rounded-full transition-colors"
          :class="avoidTolls ? 'bg-primary-600' : 'bg-gray-300 dark:bg-surface-600'"
          @click="avoidTolls = !avoidTolls"
        >
          <span
            class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
            :class="avoidTolls ? 'translate-x-4' : 'translate-x-0'"
          />
        </button>
        <span class="text-sm font-medium">Avoid toll roads</span>
      </label>
      
      <TollSelector
        v-if="!avoidTolls"
        class="toll-selector"
        :highlight="tollHighlight"
        @update:toll="tollEstimate = $event; tollHighlight = false"
      />
      
      <button
        class="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
        :disabled="!origin || !destination || isLoadingRoute"
        @click="planRoute"
      >
        {{ isLoadingRoute ? 'Calculating route…' : 'Plan Route' }}
      </button>
      
      <p v-if="routeError" class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
        {{ routeError }}
      </p>

      <div v-if="noVehicleWarning" class="text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3">
        You need to add a vehicle before planning a route.
        <NuxtLink to="/fuel-log" class="font-semibold underline ml-1 hover:text-amber-900 dark:hover:text-amber-200">Add a vehicle</NuxtLink>
      </div>


      <TripCostSummary
        v-if="route"
        :route="route"
        :toll="tollEstimate"
        :avoid-tolls="avoidTolls"
      />
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";
.label { @apply block text-xs font-semibold text-gray-400 uppercase mb-1; }
.input-field { @apply border border-gray-200 dark:border-surface-600 dark:bg-surface-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500; }
</style>
