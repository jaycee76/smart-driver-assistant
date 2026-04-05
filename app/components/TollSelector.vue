<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { TollEstimate, TollBreakdownItem } from '~/types'
import { useFuelStore } from '~/stores/fuel'
import { useSettingsStore } from '~/stores/settings'

interface TollPoint {
  id: number
  name: string
  expressway: string
}

interface TollRow {
  id: number
  expressway: string
  entryId: number | null
  exitId: number | null
  fee: number | null
  loading: boolean
  notFound: boolean
}

const emit = defineEmits<{
  (e: 'update:toll', value: TollEstimate | null): void
}>()

const props = defineProps<{ highlight?: boolean }>()

const fuelStore = useFuelStore()
const settings = useSettingsStore()

const expressways = ref<Record<string, string>>({})
const tollPoints = ref<TollPoint[]>([])
const dataLoaded = ref(false)
const dataError = ref(false)
let nextId = 0

const vehicleClass = computed(() =>
  fuelStore.activeVehicle?.type === 'truck' ? 2 : 1,
)

const rows = ref<TollRow[]>([makeRow()])

function makeRow(): TollRow {
  return { id: nextId++, expressway: '', entryId: null, exitId: null, fee: null, loading: false, notFound: false }
}

const pointsByExpressway = computed(() => {
  const map: Record<string, TollPoint[]> = {}
  for (const p of tollPoints.value) {
    if (!map[p.expressway]) map[p.expressway] = []
    map[p.expressway].push(p)
  }
  return map
})

const expresswayList = computed(() =>
  Object.entries(expressways.value).map(([id, name]) => ({ id, name })),
)

function pointsFor(expressway: string) {
  return pointsByExpressway.value[expressway] ?? []
}

const totalFee = computed(() =>
  rows.value.reduce((sum, r) => sum + (r.fee ?? 0), 0),
)

const hasAnyFee = computed(() => rows.value.some((r) => r.fee !== null))

onMounted(async () => {
  try {
    const data = await $fetch<{ expressways: Record<string, string>; tollPoints: TollPoint[] }>(
      '/api/toll-data',
    )
    expressways.value = data.expressways
    tollPoints.value = data.tollPoints
    dataLoaded.value = true
  } catch {
    dataError.value = true
  }
})

function onExpresswayChange(row: TollRow) {
  row.entryId = null
  row.exitId = null
  row.fee = null
  row.notFound = false
  emitToll()
}

function onEntryChange(row: TollRow) {
  row.exitId = null
  row.fee = null
  row.notFound = false
  emitToll()
}

async function onExitChange(row: TollRow) {
  row.fee = null
  row.notFound = false

  if (!row.entryId || !row.exitId || row.entryId === row.exitId) {
    emitToll()
    return
  }

  row.loading = true
  try {
    const result = await $fetch<{ fee: number; found: boolean }>('/api/toll-fee', {
      params: {
        entryId: row.entryId,
        exitId: row.exitId,
        vehicleClass: vehicleClass.value,
      },
    })
    row.fee = result.found ? result.fee : 0
    row.notFound = !result.found
  } finally {
    row.loading = false
    emitToll()
  }
}

function addRow() {
  rows.value.push(makeRow())
}

function removeRow(id: number) {
  rows.value = rows.value.filter((r) => r.id !== id)
  if (rows.value.length === 0) rows.value.push(makeRow())
  emitToll()
}

function emitToll() {
  const active = rows.value.filter((r) => r.fee !== null)

  if (active.length === 0) {
    emit('update:toll', null)
    return
  }

  const breakdown: TollBreakdownItem[] = active.map((r) => {
    const entryPt = tollPoints.value.find((p) => p.id === r.entryId)
    const exitPt = tollPoints.value.find((p) => p.id === r.exitId)
    return {
      entryPoint: entryPt?.name ?? '',
      exitPoint: exitPt?.name ?? '',
      expressway: r.expressway,
      expresswayName: expressways.value[r.expressway] ?? r.expressway,
      fee: r.fee!,
    }
  })

  const names = [...new Set(breakdown.map((b) => b.expresswayName))].join(' + ')
  const classLabel = vehicleClass.value === 2 ? 'Class 2 (truck)' : 'Class 1 (car/SUV)'

  emit('update:toll', {
    estimatedToll: totalFee.value,
    note: `Via ${names} — ${classLabel}`,
    exact: true,
    breakdown,
  })
}
</script>

<template>
  <div
    class="bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-sm border transition-colors space-y-4"
    :class="props.highlight
      ? 'border-red-400 dark:border-red-500 ring-2 ring-red-300 dark:ring-red-600'
      : 'border-gray-100 dark:border-surface-700'"
  >
    <div class="flex items-center justify-between">
      <h3 class="font-semibold">Toll Calculator</h3>
      <span class="text-xs text-gray-400">From toll.ph</span>
    </div>

    <p v-if="props.highlight" class="text-xs text-red-500 font-medium">
      Please enter your toll details before planning the route.
    </p>

    <p class="text-xs text-gray-400">
      Select the expressway and your entry/exit points to get the exact toll fee.
    </p>

    <div v-if="dataError" class="text-xs text-red-500">
      Failed to load toll data.
    </div>

    <div v-else-if="!dataLoaded" class="text-xs text-gray-400 animate-pulse">
      Loading toll data…
    </div>

    <template v-else>
      <!-- Toll rows -->
      <div
        v-for="row in rows"
        :key="row.id"
        class="space-y-2 pb-3 border-b border-gray-100 dark:border-surface-700 last:border-0 last:pb-0"
      >
        <!-- Expressway selector -->
        <div>
          <label class="label">Expressway</label>
          <select
            v-model="row.expressway"
            class="input-field w-full"
            @change="onExpresswayChange(row)"
          >
            <option value="">— Select expressway —</option>
            <option v-for="e in expresswayList" :key="e.id" :value="e.id">
              {{ e.name }}
            </option>
          </select>
        </div>

        <!-- Entry / Exit selectors (shown once expressway selected) -->
        <template v-if="row.expressway">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="label">Entry point</label>
              <select
                v-model="row.entryId"
                class="input-field w-full"
                @change="onEntryChange(row)"
              >
                <option :value="null">— Entry —</option>
                <option
                  v-for="p in pointsFor(row.expressway)"
                  :key="p.id"
                  :value="p.id"
                >
                  {{ p.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="label">Exit point</label>
              <select
                v-model="row.exitId"
                class="input-field w-full"
                :disabled="!row.entryId"
                @change="onExitChange(row)"
              >
                <option :value="null">— Exit —</option>
                <option
                  v-for="p in pointsFor(row.expressway).filter((p) => p.id !== row.entryId)"
                  :key="p.id"
                  :value="p.id"
                >
                  {{ p.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Fee result row -->
          <div class="flex items-center justify-between text-sm">
            <span v-if="row.loading" class="text-xs text-gray-400 animate-pulse">Looking up fee…</span>
            <span v-else-if="row.notFound" class="text-xs text-amber-500">
              No fee found for this pair — check toll.ph
            </span>
            <span v-else-if="row.fee !== null" class="text-primary-600 dark:text-primary-400 font-semibold">
              {{ settings.formatPeso(row.fee) }}
            </span>
            <span v-else class="text-xs text-gray-300 dark:text-gray-600">Select entry & exit</span>

            <button
              v-if="rows.length > 1"
              class="text-xs text-gray-400 hover:text-red-500 transition-colors"
              @click="removeRow(row.id)"
            >
              Remove
            </button>
          </div>
        </template>
      </div>

      <!-- Add row button -->
      <button
        class="w-full text-sm text-primary-600 dark:text-primary-400 border border-dashed border-primary-300 dark:border-primary-700 rounded-xl py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
        @click="addRow"
      >
        + Add another toll road
      </button>

      <!-- Total -->
      <div
        v-if="hasAnyFee"
        class="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-surface-700"
      >
        <span class="text-sm font-medium text-gray-500">Total toll</span>
        <div class="flex items-center gap-2">
          <span class="text-xs bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full">
            exact
          </span>
          <span class="font-bold text-primary-600 dark:text-primary-400">
            {{ settings.formatPeso(totalFee) }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";
.label { @apply block text-xs font-semibold text-gray-400 uppercase mb-1; }
.input-field { @apply border border-gray-200 dark:border-surface-600 dark:bg-surface-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500; }
</style>
