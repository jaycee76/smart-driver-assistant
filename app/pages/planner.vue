<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import type { TollEstimate } from '~/types'
import type { RouteResponse } from '~/types/maps'
import { useFuelStore } from '~/stores/fuel'

const fuelStore = useFuelStore()
const noVehicleWarning = ref(false)

const hasNoFillUpHistory = computed(() => {
  if (!fuelStore.activeVehicle) return false
  return fuelStore.getLastPrice(fuelStore.activeVehicle.id) === 0
})

const originInputRef = ref<HTMLInputElement | null>(null)
const destinationInputRef = ref<HTMLInputElement | null>(null)

const { loadMaps } = useGoogleMaps()
const { selectedPlace: originPlace, initAutocomplete: initOriginAC } = usePlacesAutocomplete(originInputRef)
const { selectedPlace: destPlace, initAutocomplete: initDestAC } = usePlacesAutocomplete(destinationInputRef)

const routePolyline = ref<string | undefined>(undefined)
const routeResult = ref<RouteResponse | null>(null)
const isLoadingRoute = ref(false)
const routeError = ref<string | null>(null)
const routePlanned = ref(false)

const avoidTolls = ref(false)
const tollEstimate = ref<TollEstimate | null>(null)
const tollHighlight = ref(false)

watch(avoidTolls, () => {
  tollEstimate.value = null
  tollHighlight.value = false
})

watch(routePlanned, async (val) => {
  if (!val) {
    await nextTick()
    initOriginAC()
    initDestAC()
  }
})

onMounted(async () => {
  try {
    await loadMaps()
    initOriginAC()
    initDestAC()
  } catch {
    // loadError is surfaced in MapView
  }
})

function resetRoute() {
  routeResult.value = null
  routePolyline.value = undefined
  routePlanned.value = false
  routeError.value = null
  tollEstimate.value = null
  tollHighlight.value = false
  noVehicleWarning.value = false
  originPlace.value = null
  destPlace.value = null
  if (originInputRef.value) originInputRef.value.value = ''
  if (destinationInputRef.value) destinationInputRef.value.value = ''
}

async function planRoute() {
  if (!originPlace.value || !destPlace.value) {
    routeError.value = 'Please select both an origin and a destination from the suggestions.'
    return
  }

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
  routeResult.value = null
  routePolyline.value = undefined

  try {
    const result = await $fetch<RouteResponse>('/api/route', {
      method: 'POST',
      body: {
        origin: `${originPlace.value.lat},${originPlace.value.lng}`,
        destination: `${destPlace.value.lat},${destPlace.value.lng}`,
        avoidTolls: avoidTolls.value,
      },
    })
    routeResult.value = result
    routePolyline.value = result.polyline
    routePlanned.value = true
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode
    const msg = (err as { statusMessage?: string; message?: string })?.statusMessage
      ?? (err instanceof Error ? err.message : String(err))

    if (status === 422) {
      routeError.value = 'No route found between these locations.'
    } else if (msg?.includes('REQUEST_DENIED') || msg?.includes('Route unavailable')) {
      routeError.value = 'Route unavailable. Please try again.'
    } else if (msg?.includes('fetch') || msg?.includes('network') || msg?.toLowerCase().includes('timeout')) {
      routeError.value = 'Could not load route. Check your connection.'
    } else {
      routeError.value = msg ?? 'Route calculation failed.'
    }
  } finally {
    isLoadingRoute.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-8 max-w-5xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Journey Planner</h1>

    <div
      v-if="hasNoFillUpHistory"
      class="mb-4 flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3 text-sm"
    >
      <span class="mt-0.5 shrink-0">⚠️</span>
      <span>
        No fill-up history found for your vehicle. Log a fill-up first so the planner can calculate fuel costs.
        <NuxtLink to="/fuel-log" class="font-semibold underline ml-1 hover:text-amber-900 dark:hover:text-amber-200">Log a fill-up</NuxtLink>
      </span>
    </div>

    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Left column: controls -->
      <div class="flex flex-col gap-4 w-full lg:w-96 lg:shrink-0">
        <!-- Planning form (hidden once route is planned) -->
        <template v-if="!routePlanned">
          <!-- Origin search -->
          <div class="relative">
            <label class="label">Origin</label>
            <input
              ref="originInputRef"
              type="text"
              placeholder="Search origin…"
              class="input-field w-full"
            />
          </div>

          <!-- Destination search -->
          <div class="relative">
            <label class="label">Destination</label>
            <input
              ref="destinationInputRef"
              type="text"
              placeholder="Search destination…"
              class="input-field w-full"
            />
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
            :disabled="!originPlace || !destPlace || isLoadingRoute"
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
        </template>

        <!-- Results state -->
        <template v-else>
          <!-- Route summary header -->
          <div class="bg-white dark:bg-surface-800 rounded-2xl px-4 py-3 border border-gray-100 dark:border-surface-700 text-sm space-y-0.5">
            <p class="text-xs text-gray-400 uppercase font-semibold">Route</p>
            <p class="font-medium truncate">{{ originPlace?.label }}</p>
            <p class="text-gray-400 text-xs">to</p>
            <p class="font-medium truncate">{{ destPlace?.label }}</p>
          </div>

          <button
            class="w-full border border-gray-200 dark:border-surface-600 hover:bg-gray-50 dark:hover:bg-surface-700 text-sm font-semibold py-3 rounded-xl transition-colors"
            @click="resetRoute"
          >
            Plan New Route
          </button>

          <TripCostSummary
            v-if="routeResult"
            :route="routeResult"
            :toll="tollEstimate"
            :avoid-tolls="avoidTolls"
            :duration-in-traffic-min="routeResult.durationInTrafficMin"
            :traffic-delay-min="routeResult.trafficDelayMin"
            :traffic-condition="routeResult.trafficCondition"
          />
        </template>
      </div>

      <!-- Right column: map -->
      <div class="w-full h-[400px] md:h-[500px] lg:h-[500px] overflow-hidden">
        <MapView
          :polyline="routePolyline"
          :speed-intervals="routeResult?.speedIntervals"
          :origin="originPlace ? { lat: originPlace.lat, lng: originPlace.lng, label: originPlace.label } : undefined"
          :destination="destPlace ? { lat: destPlace.lat, lng: destPlace.lng, label: destPlace.label } : undefined"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";
.label { @apply block text-xs font-semibold text-gray-400 uppercase mb-1; }
.input-field { @apply border border-gray-200 dark:border-surface-600 dark:bg-surface-700 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary-500; }
</style>
