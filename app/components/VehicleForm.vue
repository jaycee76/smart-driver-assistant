<script setup lang="ts">
import { ref } from 'vue'
import { useFuelStore } from '~/stores/fuel'
import type { Vehicle, VehiclePreset, VehicleLookupResult, FuelType, VehicleType } from '~/types'

const emit = defineEmits<{ close: [] }>()

const fuelStore = useFuelStore()

type Step = 'search' | 'review'
const step = ref<Step>('search')
const query = ref('')
const isLoading = ref(false)
const lookupError = ref<string | null>(null)
const presets = ref<VehiclePreset[]>([])
const efficiencySource = ref<'ai-estimated' | 'preset'>('ai-estimated')

// Editable fields after lookup
const editEfficiency = ref(0)
const editFuelType = ref<FuelType>('Ron95')
const editTankCapacity = ref(0)
const editNotes = ref('')
const editSource = ref('')
const vehicleName = ref('')
const vehicleBrand = ref('')
const vehicleModel = ref('')
const vehicleYear = ref(new Date().getFullYear())
const vehicleType = ref<VehicleType>('car')

async function lookupVehicle() {
  if (!query.value.trim()) return
  isLoading.value = true
  lookupError.value = null

  try {
    const result = await $fetch<VehicleLookupResult | { error: string }>('/api/vehicle-lookup', {
      method: 'POST',
      body: { query: query.value },
    })

    if ('error' in result) {
      lookupError.value = result.error === 'rate_limited'
        ? 'Gemini API rate limit reached. Wait a moment and try again, or select from presets below.'
        : 'AI lookup failed. Please select from presets below.'
      await loadPresets()
    } else {
      efficiencySource.value = 'ai-estimated'
      editEfficiency.value = result.efficiency
      editFuelType.value = result.fuelType
      editTankCapacity.value = result.tankCapacity
      editNotes.value = result.notes
      editSource.value = result.source
      // Parse vehicle details from query
      const parts = query.value.trim().split(' ')
      vehicleBrand.value = parts[0] ?? ''
      vehicleModel.value = parts.slice(1, -1).join(' ') || (parts[1] ?? '')
      vehicleYear.value = parseInt(parts[parts.length - 1] ?? '') || new Date().getFullYear()
      vehicleName.value = `${vehicleBrand.value} ${vehicleModel.value}`.trim()
      step.value = 'review'
    }
  } finally {
    isLoading.value = false
  }
}

async function loadPresets() {
  if (presets.value.length > 0) return
  const data = await $fetch<VehiclePreset[]>('/data/vehicles.json')
  presets.value = data
}

function selectPreset(preset: VehiclePreset) {
  efficiencySource.value = 'preset'
  editEfficiency.value = preset.efficiency
  editFuelType.value = preset.fuelType
  editTankCapacity.value = preset.tankCapacity
  editNotes.value = 'Based on manufacturer preset data'
  editSource.value = 'Local preset database'
  vehicleName.value = preset.name
  vehicleBrand.value = preset.brand
  vehicleModel.value = preset.model
  vehicleType.value = preset.type
  step.value = 'review'
}

function saveVehicle() {
  const vehicle: Vehicle = {
    id: crypto.randomUUID(),
    name: vehicleName.value,
    brand: vehicleBrand.value,
    model: vehicleModel.value,
    year: vehicleYear.value,
    type: vehicleType.value,
    fuelType: editFuelType.value,
    efficiency: editEfficiency.value,
    efficiencySource: efficiencySource.value === 'ai-estimated' ? 'ai-estimated' : 'preset',
    tankCapacity: editTankCapacity.value,
  }
  fuelStore.addVehicle(vehicle)
  emit('close')
}

const FUEL_TYPES: FuelType[] = ['Ron91', 'Ron95', 'Ron97', 'Diesel']
const VEHICLE_TYPES: VehicleType[] = ['car', 'motorcycle', 'truck', 'bus', 'van']
</script>

<template>
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-lg font-bold">Add Vehicle</h2>
        <button class="text-gray-400 hover:text-gray-600 text-xl leading-none" @click="emit('close')">✕</button>
      </div>

      <!-- Step 1: Search -->
      <div v-if="step === 'search'" class="space-y-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Enter your vehicle's brand, model, and year to auto-fill specs.
        </p>
        <input
          v-model="query"
          type="text"
          placeholder="e.g. Toyota Vios 2022"
          class="w-full border border-gray-200 dark:border-surface-600 dark:bg-surface-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          @keyup.enter="lookupVehicle"
        />
        <button
          class="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          :disabled="isLoading || !query.trim()"
          @click="lookupVehicle"
        >
          <span v-if="isLoading">AI Looking up<span class="dots"><span>.</span><span>.</span><span>.</span></span></span>
          <span v-else>Look up vehicle</span>
        </button>

        <div v-if="lookupError" class="text-sm text-red-500">{{ lookupError }}</div>

        <!-- Preset fallback -->
        <div v-if="presets.length > 0" class="mt-2">
          <p class="text-xs font-semibold text-gray-400 uppercase mb-2">Or select from presets</p>
          <div class="max-h-52 overflow-y-auto space-y-1 border border-gray-100 dark:border-surface-700 rounded-xl p-2">
            <button
              v-for="preset in presets"
              :key="preset.name"
              class="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
              @click="selectPreset(preset)"
            >
              <span class="font-medium">{{ preset.name }}</span>
              <span class="text-gray-400 ml-2 text-xs">{{ preset.efficiency }} km/L · {{ preset.fuelType }}</span>
            </button>
          </div>
        </div>

        <button
          class="w-full text-sm text-gray-400 hover:text-gray-600 py-2 underline"
          @click="loadPresets"
        >
          Browse all presets instead
        </button>
      </div>

      <!-- Step 2: Review & Confirm -->
      <div v-else-if="step === 'review'" class="space-y-4">
        <div class="bg-primary-50 dark:bg-primary-900/20 rounded-xl px-4 py-3 text-sm">
          <div class="font-medium text-primary-700 dark:text-primary-300">
            <span v-if="efficiencySource === 'ai-estimated'">🤖 AI Estimated</span>
            <span v-else>📋 From preset database</span>
          </div>
          <p class="text-xs text-gray-400 mt-0.5">Based on: {{ editSource }}</p>
          <p class="text-xs text-gray-400 mt-0.5">Feel free to change any details before saving</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2">
            <label class="label">Vehicle Name</label>
            <input v-model="vehicleName" class="input-field w-full" />
          </div>
          <div>
            <label class="label">Year</label>
            <input v-model.number="vehicleYear" type="number" class="input-field w-full" />
          </div>
          <div>
            <label class="label">Type</label>
            <select v-model="vehicleType" class="input-field w-full">
              <option v-for="t in VEHICLE_TYPES" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div>
            <label class="label">Fuel Type</label>
            <select v-model="editFuelType" class="input-field w-full">
              <option v-for="f in FUEL_TYPES" :key="f" :value="f">{{ f }}</option>
            </select>
          </div>
          <div>
            <label class="label">Efficiency (km/L)</label>
            <input v-model.number="editEfficiency" type="number" step="0.1" class="input-field w-full" />
          </div>
          <div>
            <label class="label">Tank Capacity (L)</label>
            <input v-model.number="editTankCapacity" type="number" step="0.5" class="input-field w-full" />
          </div>
        </div>

        <p v-if="editNotes" class="text-xs text-gray-400 italic">{{ editNotes }}</p>

        <div class="flex gap-3 pt-2">
          <button
            class="flex-1 border border-gray-200 dark:border-surface-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
            @click="step = 'search'"
          >
            Back
          </button>
          <button
            class="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors"
            @click="saveVehicle"
          >
            Save Vehicle
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";
.label { @apply block text-xs font-semibold text-gray-400 uppercase mb-1; }
.input-field { @apply border border-gray-200 dark:border-surface-600 dark:bg-surface-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500; }

.dots span {
  animation: dot-blink 1.4s infinite;
  opacity: 0;
}
.dots span:nth-child(2) { animation-delay: 0.2s; }
.dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-blink {
  0%, 60%, 100% { opacity: 0; }
  30% { opacity: 1; }
}
</style>
