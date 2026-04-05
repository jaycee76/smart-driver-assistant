<script setup lang="ts">
import { computed } from 'vue'
import type { RouteResult, TollEstimate } from '~/types'
import { useFuelStore } from '~/stores/fuel'
import { useSettingsStore } from '~/stores/settings'
import { useCalculator } from '~/composables/useCalculator'

const props = defineProps<{
  route: RouteResult
  toll?: TollEstimate | null
  avoidTolls?: boolean
}>()

const fuelStore = useFuelStore()
const settings = useSettingsStore()

const vehicle = computed(() => fuelStore.activeVehicle)
const lastPrice = computed(() =>
  vehicle.value ? fuelStore.getLastPrice(vehicle.value.id) : 0,
)

const fuelResult = computed(() =>
  vehicle.value
    ? useCalculator({
        distanceKm: props.route.distanceKm,
        efficiencyKmL: vehicle.value.efficiency,
        pricePerLiter: lastPrice.value,
      })
    : null,
)

const tollFee = computed(() => props.toll?.estimatedToll ?? 0)

const grandTotal = computed(() =>
  (fuelResult.value?.totalCost ?? 0) + tollFee.value,
)
</script>

<template>
  <div class="bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-surface-700 space-y-3">
    <h3 class="font-semibold">Trip Cost Summary</h3>

    <!-- Route breakdown -->
    <div class="text-sm space-y-1.5">
      <div class="flex justify-between">
        <span class="text-gray-400">Distance</span>
        <span>{{ route.distanceKm.toFixed(1) }} km</span>
      </div>
    </div>

    <!-- Fuel cost -->
    <div v-if="fuelResult && lastPrice > 0" class="border-t border-gray-100 dark:border-surface-700 pt-3 space-y-1.5 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-400">Liters needed</span>
        <span>{{ fuelResult.litersNeeded.toFixed(2) }}L</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-400">Fuel price</span>
        <span>₱{{ lastPrice.toFixed(2) }}/L</span>
      </div>
      <div class="flex justify-between font-medium">
        <span class="text-gray-400">Fuel cost</span>
        <span>{{ settings.formatPeso(fuelResult.totalCost) }}</span>
      </div>
    </div>

    <!-- Toll fees -->
    <div v-if="!avoidTolls" class="border-t border-gray-100 dark:border-surface-700 pt-3 text-sm space-y-1.5">
      <template v-if="route.hasTolls">
        <!-- Breakdown per segment (when available) -->
        <template v-if="toll?.breakdown && toll.breakdown.length > 0">
          <div
            v-for="(seg, i) in toll.breakdown"
            :key="i"
            class="flex justify-between items-start gap-2"
          >
            <span class="text-gray-400 text-xs">
              {{ seg.expresswayName || seg.expressway || 'Toll road' }}
              <span class="block text-gray-300 dark:text-gray-600">{{ seg.entryPoint }} → {{ seg.exitPoint }}</span>
            </span>
            <span class="font-medium shrink-0">
              {{ seg.fee > 0 ? settings.formatPeso(seg.fee) : '—' }}
            </span>
          </div>
          <div class="flex justify-between items-center border-t border-gray-100 dark:border-surface-700 pt-1.5">
            <span class="flex items-center gap-1.5 text-gray-500 font-medium">
              Total toll
              <span
                class="text-xs px-1.5 py-0.5 rounded-full"
                :class="toll.exact
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-accent-100 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400'"
              >
                {{ toll.exact ? 'exact' : 'est.' }}
              </span>
            </span>
            <span class="font-semibold">{{ settings.formatPeso(tollFee) }}</span>
          </div>
        </template>

        <!-- Simple total (no breakdown or loading) -->
        <template v-else>
          <div class="flex justify-between items-center gap-2">
            <span class="flex items-center gap-1.5 text-gray-400">
              Toll fees
              <span
                v-if="toll"
                class="text-xs px-1.5 py-0.5 rounded-full"
                :class="toll.exact
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-accent-100 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400'"
              >
                {{ toll.exact ? 'exact' : 'est.' }}
              </span>
            </span>
            <span class="font-medium">{{ toll ? settings.formatPeso(tollFee) : '…' }}</span>
          </div>
        </template>

        <p v-if="toll?.note && route.hasTolls" class="text-xs text-gray-400 italic">{{ toll.note }}</p>
        <p v-if="toll?.exact" class="text-xs text-green-500">
          Prices sourced from toll.ph
        </p>
      </template>

      <p v-if="!route.hasTolls" class="text-xs text-green-500">✓ No toll roads on this route</p>
    </div>

    <div v-if="avoidTolls" class="border-t border-gray-100 dark:border-surface-700 pt-3">
      <p class="text-xs text-green-500">✓ Routed to avoid toll roads</p>
    </div>

    <!-- Grand total -->
    <div v-if="fuelResult && lastPrice > 0" class="border-t border-gray-100 dark:border-surface-700 pt-3">
      <div class="flex justify-between text-lg font-bold text-primary-600 dark:text-primary-400">
        <span>Total Cost</span>
        <span>{{ settings.formatPeso(grandTotal) }}</span>
      </div>
      <p v-if="!avoidTolls && route.hasTolls" class="text-xs text-gray-400 mt-1">
        Fuel + {{ toll?.exact ? 'exact' : 'estimated' }} toll
      </p>
    </div>

    <div v-else class="text-xs text-gray-400 pt-1">
      Log a fill-up to see cost estimates.
    </div>

    <p class="text-xs text-gray-400 italic">
      Fuel estimate and time estimate assumes ideal conditions. Actual consumption and time estimates may be higher in heavy traffic.
    </p>
  </div>
</template>
