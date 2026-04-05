<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFuelStore } from '~/stores/fuel'
import type { FuelLog, FuelType } from '~/types'

const props = defineProps<{ log?: FuelLog }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const fuelStore = useFuelStore()

const FUEL_TYPES: FuelType[] = ['Ron91', 'Ron95', 'Ron97', 'Diesel']

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const form = ref({
  vehicleId: props.log?.vehicleId ?? fuelStore.activeVehicleId,
  date: props.log?.date?.slice(0, 10) ?? (import.meta.client ? todayLocal() : ''),
  fuelType: (props.log?.fuelType ?? 'Ron95') as FuelType,
  pricePerLiter: props.log?.pricePerLiter ?? 0,
  liters: props.log?.liters ?? 0,
  odometer: props.log?.odometer as number | undefined,
  station: props.log?.station ?? '',
  notes: props.log?.notes ?? '',
})

const totalCost = computed(() =>
  Math.round(form.value.pricePerLiter * form.value.liters * 100) / 100,
)

// Auto-fill last price when vehicle changes
watch(() => form.value.vehicleId, (id) => {
  const last = fuelStore.getLastPrice(id)
  if (last > 0) form.value.pricePerLiter = last
})

function save() {
  if (!form.value.vehicleId || !form.value.pricePerLiter || !form.value.liters) return

  const log: FuelLog = {
    id: props.log?.id ?? crypto.randomUUID(),
    date: new Date(form.value.date).toISOString(),
    vehicleId: form.value.vehicleId,
    fuelType: form.value.fuelType,
    pricePerLiter: form.value.pricePerLiter,
    liters: form.value.liters,
    totalCost: totalCost.value,
    odometer: form.value.odometer,
    station: form.value.station || undefined,
    notes: form.value.notes || undefined,
  }

  if (props.log) {
    fuelStore.updateFuelLog(log)
  } else {
    fuelStore.addFuelLog(log)
  }
  emit('saved')
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-lg font-bold">{{ log ? 'Edit' : 'Add' }} Fuel Log</h2>
        <button class="text-gray-400 hover:text-gray-600 text-xl leading-none" @click="emit('close')">✕</button>
      </div>

      <div class="space-y-3">
        <div>
          <label class="label">Vehicle</label>
          <VehicleSelector v-model="form.vehicleId" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Date</label>
            <input v-model="form.date" type="date" class="input-field w-full" />
          </div>
          <div>
            <label class="label">Fuel Type</label>
            <select v-model="form.fuelType" class="input-field w-full">
              <option v-for="f in FUEL_TYPES" :key="f" :value="f">{{ f }}</option>
            </select>
          </div>
          <div>
            <label class="label">Price per Liter (₱)</label>
            <input v-model.number="form.pricePerLiter" type="number" step="0.01" min="0" class="input-field w-full" />
          </div>
          <div>
            <label class="label">Liters</label>
            <input v-model.number="form.liters" type="number" step="0.01" min="0" class="input-field w-full" />
          </div>
        </div>

        <div class="bg-primary-50 dark:bg-primary-900/20 rounded-xl px-4 py-3 text-center">
          <span class="text-sm text-gray-500 dark:text-gray-400">Total Cost</span>
          <p class="text-2xl font-bold text-primary-600 dark:text-primary-300">₱{{ totalCost.toFixed(2) }}</p>
        </div>

        <div>
          <label class="label">Odometer (km) <span class="text-gray-300 normal-case font-normal">(optional)</span></label>
          <input v-model.number="form.odometer" type="number" min="0" class="input-field w-full" />
        </div>
        <div>
          <label class="label">Station <span class="text-gray-300 normal-case font-normal">(optional)</span></label>
          <input v-model="form.station" type="text" placeholder="Shell, Petron, Caltex…" class="input-field w-full" />
        </div>
        <div>
          <label class="label">Notes <span class="text-gray-300 normal-case font-normal">(optional)</span></label>
          <textarea v-model="form.notes" rows="2" class="input-field w-full resize-none" />
        </div>

        <div class="flex gap-3 pt-2">
          <button
            class="flex-1 border border-gray-200 dark:border-surface-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            class="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors"
            @click="save"
          >
            Save Log
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
</style>
