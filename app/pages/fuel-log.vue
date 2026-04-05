<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFuelStore } from '~/stores/fuel'
import { useSettingsStore } from '~/stores/settings'
import type { FuelLog, FuelType } from '~/types'

const fuelStore = useFuelStore()
const settings = useSettingsStore()

const showAddLog = ref(false)
const showAddVehicle = ref(false)
const editingLog = ref<FuelLog | null>(null)
const pendingDeleteId = ref<string | null>(null)
const filterVehicleId = ref('')
const filterFuelType = ref<FuelType | ''>('')
const filterMonth = ref(import.meta.client ? (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})() : '')

const FUEL_TYPES: FuelType[] = ['Ron91', 'Ron95', 'Ron97', 'Diesel']

const filteredLogs = computed(() =>
  fuelStore.fuelLogs.filter((l) => {
    if (filterVehicleId.value && l.vehicleId !== filterVehicleId.value) return false
    if (filterFuelType.value && l.fuelType !== filterFuelType.value) return false
    if (filterMonth.value && !l.date.startsWith(filterMonth.value)) return false
    return true
  }),
)

const stats = computed(() => {
  const logs = filteredLogs.value
  if (logs.length === 0) return null
  return {
    totalSpent: logs.reduce((s, l) => s + l.totalCost, 0),
    totalLiters: logs.reduce((s, l) => s + l.liters, 0),
    avgPrice: logs.reduce((s, l) => s + l.pricePerLiter, 0) / logs.length,
    count: logs.length,
  }
})

function vehicleName(id: string): string {
  return fuelStore.vehicles.find((v) => v.id === id)?.name ?? id
}
</script>

<template>
  <div class="p-4 md:p-8 max-w-4xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Fuel Log</h1>
      <button
        class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        @click="fuelStore.vehicles.length === 0 ? showAddVehicle = true : showAddLog = true"
      >
        + Add Fill-up
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-6">
      <select v-model="filterVehicleId" class="filter-select">
        <option value="">All Vehicles</option>
        <option v-for="v in fuelStore.vehicles" :key="v.id" :value="v.id">{{ v.name }}</option>
      </select>
      <select v-model="filterFuelType" class="filter-select">
        <option value="">All Fuel Types</option>
        <option v-for="f in FUEL_TYPES" :key="f" :value="f">{{ f }}</option>
      </select>
      <input v-model="filterMonth" type="month" class="filter-select" />
    </div>

    <!-- Stats -->
    <div v-if="stats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatCard label="Total Spent" :value="settings.formatPeso(stats.totalSpent)" />
      <StatCard label="Avg Price/L" :value="`₱${stats.avgPrice.toFixed(2)}`" />
      <StatCard label="Total Liters" :value="`${stats.totalLiters.toFixed(1)}L`" />
      <StatCard label="Fill-ups" :value="stats.count.toString()" />
    </div>

    <!-- Price history chart -->
    <div class="bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-surface-700 mb-6">
      <h2 class="font-semibold mb-4">Price History</h2>
      <PriceHistoryChart :logs="filteredLogs" />
    </div>

    <!-- Log list -->
    <div class="bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-surface-700">
      <div v-if="filteredLogs.length === 0" class="text-center py-10 text-gray-400 text-sm">
        No logs found. Try adjusting filters or add a fill-up.
      </div>
      <div v-else class="divide-y divide-gray-100 dark:divide-surface-700">
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          class="py-4 flex justify-between items-start gap-4"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <span class="text-sm font-semibold">{{ log.fuelType }}</span>
              <span class="text-xs text-gray-400">{{ vehicleName(log.vehicleId) }}</span>
            </div>
            <p class="text-xs text-gray-400">
              {{ new Date(log.date).toLocaleDateString('en-PH', { dateStyle: 'medium' }) }}
              <span v-if="log.station"> · {{ log.station }}</span>
              <span v-if="log.odometer"> · {{ log.odometer.toLocaleString() }} km</span>
            </p>
            <p v-if="log.notes" class="text-xs text-gray-400 mt-0.5 italic">{{ log.notes }}</p>
          </div>
          <div class="text-right flex-shrink-0">
            <p class="text-sm font-bold">{{ settings.formatPeso(log.totalCost) }}</p>
            <p class="text-xs text-gray-400">{{ log.liters.toFixed(2) }}L · ₱{{ log.pricePerLiter.toFixed(2) }}/L</p>
            <div class="flex gap-3 mt-1 justify-end">
              <button class="text-xs text-primary-500 hover:underline" @click="editingLog = log">Edit</button>
              <button class="text-xs text-red-400 hover:underline" @click="pendingDeleteId = log.id">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <FuelLogForm v-if="showAddLog" @close="showAddLog = false" @saved="showAddLog = false" />
    <FuelLogForm v-if="editingLog" :log="editingLog" @close="editingLog = null" @saved="editingLog = null" />
    <VehicleForm v-if="showAddVehicle" @close="showAddVehicle = false" />
    <ConfirmDialog
      v-if="pendingDeleteId"
      title="Delete fill-up?"
      message="This fill-up will be permanently removed from your log."
      @confirm="fuelStore.deleteFuelLog(pendingDeleteId!); pendingDeleteId = null"
      @cancel="pendingDeleteId = null"
    />
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";
.filter-select {
  @apply border border-gray-200 dark:border-surface-600 dark:bg-surface-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500;
}
</style>
