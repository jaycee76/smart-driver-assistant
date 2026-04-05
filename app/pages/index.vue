<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFuelStore } from '~/stores/fuel'
import { useSettingsStore } from '~/stores/settings'

const fuelStore = useFuelStore()
const settings = useSettingsStore()

const showAddLog = ref(false)
const showAddVehicle = ref(false)

const currentMonth = new Date().toISOString().slice(0, 7)
const monthlySpend = computed(() => fuelStore.getMonthlySpend(currentMonth))
const lastLog = computed(() => fuelStore.fuelLogs[0] ?? null)
const recentLogs = computed(() => fuelStore.fuelLogs.slice(0, 5))
const activeVehicle = computed(() => fuelStore.activeVehicle)
const avgEfficiency = computed(() =>
  activeVehicle.value ? fuelStore.getAverageEfficiency(activeVehicle.value.id) : 0,
)
</script>

<template>
  <div class="p-4 md:p-8 max-w-4xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <p class="text-sm text-gray-400">
          {{ new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
        </p>
      </div>
      <button
        class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        @click="fuelStore.vehicles.length === 0 ? showAddVehicle = true : showAddLog = true"
      >
        + Add Fill-up
      </button>
    </div>

    <!-- Empty state -->
    <div v-if="fuelStore.vehicles.length === 0" class="text-center py-16">
      <img src="/images/smart-driver-assistant-logo.jpg" alt="Smart Driver Assistant" class="w-24 h-24 object-contain mx-auto mb-4 rounded-2xl" />
      <h2 class="text-xl font-semibold mb-2">Welcome to Smart Driver Assistant</h2>
      <p class="text-gray-400 text-sm mb-6">Add your vehicle to start tracking fuel costs.</p>
      <button
        class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        @click="showAddVehicle = true"
      >
        Add My Vehicle
      </button>
    </div>

    <template v-else>
      <!-- Summary cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Last price"
          :value="lastLog ? `₱${lastLog.pricePerLiter.toFixed(2)}/L` : '—'"
          :sub="lastLog ? lastLog.fuelType : 'No logs yet'"
          icon=""
        />
        <StatCard
          label="This month"
          :value="settings.formatPeso(monthlySpend)"
          sub="Total fuel spend"
          icon=""
        />
        <StatCard
          label="Active vehicle"
          :value="activeVehicle?.name ?? '—'"
          :sub="activeVehicle?.year?.toString()"
          icon=""
        />
        <StatCard
          label="Avg efficiency"
          :value="avgEfficiency > 0 ? `${avgEfficiency.toFixed(1)} km/L` : '—'"
          sub="Based on logs"
          icon=""
        />
      </div>

      <!-- Vehicles section -->
      <div class="bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-surface-700 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold">My Vehicles</h2>
          <button
            class="text-xs bg-primary-600 hover:bg-primary-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
            @click="showAddVehicle = true"
          >
            + Add Vehicle
          </button>
        </div>
        <div class="space-y-2">
          <button
            v-for="v in fuelStore.vehicles"
            :key="v.id"
            class="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-left"
            :class="v.id === fuelStore.activeVehicleId
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-100 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700'"
            @click="fuelStore.setActiveVehicle(v.id)"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">{{ v.type === 'motorcycle' ? '🏍️' : v.type === 'truck' ? '🚛' : v.type === 'bus' ? '🚌' : v.type === 'van' ? '🚐' : '🚗' }}</span>
              <div>
                <p class="text-sm font-semibold">{{ v.name }} ({{ v.year }})</p>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-xs text-gray-400">{{ v.efficiency }} km/L · {{ v.fuelType }}</span>
                  <AiEstimatedBadge :source="v.efficiencySource" />
                </div>
              </div>
            </div>
            <span
              v-if="v.id === fuelStore.activeVehicleId"
              class="text-xs font-semibold text-primary-600 dark:text-primary-400 flex-shrink-0"
            >Active</span>
          </button>
        </div>
      </div>

      <!-- Recent fuel logs -->
      <div class="bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-surface-700">
        <div class="flex justify-between items-center mb-4">
          <h2 class="font-semibold">Recent Fill-ups</h2>
          <NuxtLink to="/fuel-log" class="text-xs text-primary-500 hover:underline">View all →</NuxtLink>
        </div>
        <div v-if="recentLogs.length === 0" class="text-center py-8 text-gray-400 text-sm">
          No fill-ups logged yet. Add your first one!
        </div>
        <div v-else class="divide-y divide-gray-100 dark:divide-surface-700">
          <div
            v-for="log in recentLogs"
            :key="log.id"
            class="py-3 flex justify-between items-center"
          >
            <div>
              <p class="text-sm font-medium">{{ log.fuelType }} · {{ log.liters.toFixed(1) }}L</p>
              <p class="text-xs text-gray-400">
                {{ new Date(log.date).toLocaleDateString('en-PH') }}
                <span v-if="log.station"> · {{ log.station }}</span>
              </p>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold">{{ settings.formatPeso(log.totalCost) }}</p>
              <p class="text-xs text-gray-400">₱{{ log.pricePerLiter.toFixed(2) }}/L</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Modals -->
    <FuelLogForm v-if="showAddLog" @close="showAddLog = false" @saved="showAddLog = false" />
    <VehicleForm v-if="showAddVehicle" @close="showAddVehicle = false" />
  </div>
</template>
