<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFuelStore } from '~/stores/fuel'
import { useSettingsStore } from '~/stores/settings'
import { useCalculator } from '~/composables/useCalculator'

const fuelStore = useFuelStore()
const settings = useSettingsStore()

const vehicleId = ref(fuelStore.activeVehicleId)
const distanceKm = ref(0)
const pricePerLiter = ref(0)
const tripsPerWeek = ref(0)

const selectedVehicle = computed(() => fuelStore.vehicles.find((v) => v.id === vehicleId.value))

// Auto-fill price from last log when vehicle changes
watch(vehicleId, (id) => {
  const last = fuelStore.getLastPrice(id)
  if (last > 0) pricePerLiter.value = last
}, { immediate: true })

const efficiency = computed(() => selectedVehicle.value?.efficiency ?? 10)
const tankCapacity = computed(() => selectedVehicle.value?.tankCapacity ?? 40)

const result = computed(() =>
  useCalculator({
    distanceKm: distanceKm.value,
    efficiencyKmL: efficiency.value,
    pricePerLiter: pricePerLiter.value,
    trips: tripsPerWeek.value > 0 ? tripsPerWeek.value * 4 : undefined,
  }),
)

const fullTankCost = computed(() =>
  Math.round(tankCapacity.value * pricePerLiter.value * 100) / 100,
)

const showResults = computed(() => distanceKm.value > 0 && pricePerLiter.value > 0)
</script>

<template>
  <div class="p-4 md:p-8 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Cost Calculator</h1>

    <div class="bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-surface-700 mb-6 space-y-4">
      <div>
        <label class="label">Vehicle</label>
        <VehicleSelector v-model="vehicleId" />
        <p v-if="selectedVehicle" class="text-xs text-gray-400 mt-1 flex items-center gap-1">
          {{ selectedVehicle.efficiency }} km/L ·
          <AiEstimatedBadge :source="selectedVehicle.efficiencySource" />
        </p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label">Distance (km)</label>
          <input
            v-model.number="distanceKm"
            type="number"
            min="0"
            step="0.1"
            class="input-field w-full"
            placeholder="0"
          />
        </div>
        <div>
          <label class="label">Price per Liter (₱)</label>
          <input
            v-model.number="pricePerLiter"
            type="number"
            min="0"
            step="0.01"
            class="input-field w-full"
            placeholder="0.00"
          />
        </div>
        <div class="col-span-2 md:col-span-1">
          <label class="label">Trips per week <span class="text-gray-300 normal-case font-normal">(optional)</span></label>
          <input
            v-model.number="tripsPerWeek"
            type="number"
            min="0"
            class="input-field w-full"
            placeholder="0"
          />
        </div>
      </div>
    </div>

    <!-- Results -->
    <div v-if="showResults" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <StatCard label="Liters Needed" :value="`${result.litersNeeded.toFixed(2)}L`" icon="" />
        <StatCard label="Trip Cost" :value="settings.formatPeso(result.totalCost)" icon="" />
        <StatCard label="Cost per km" :value="`₱${result.costPerKm.toFixed(2)}`" icon="" />
        <StatCard label="Full Tank Cost" :value="settings.formatPeso(fullTankCost)" icon="" />
      </div>
      <div
        v-if="result.monthlyCost !== undefined"
        class="bg-accent-50 dark:bg-accent-900/20 rounded-2xl p-5 border border-accent-100 dark:border-accent-900/30"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
          Monthly Estimate ({{ tripsPerWeek }}× trips/week)
        </p>
        <p class="text-3xl font-bold text-accent-600 dark:text-accent-400">
          {{ settings.formatPeso(result.monthlyCost) }}
        </p>
      </div>
    </div>

    <div v-else class="bg-white dark:bg-surface-800 rounded-2xl p-8 text-center text-gray-400 text-sm border border-gray-100 dark:border-surface-700">
      Enter a distance and fuel price to see your trip cost.
    </div>

    <div class="mt-6">
      <NuxtLink to="/planner" class="flex items-center gap-2 text-sm text-primary-500 hover:underline">
        🗺️ Use a route distance instead
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";
.label { @apply block text-xs font-semibold text-gray-400 uppercase mb-1; }
.input-field { @apply border border-gray-200 dark:border-surface-600 dark:bg-surface-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500; }
</style>
