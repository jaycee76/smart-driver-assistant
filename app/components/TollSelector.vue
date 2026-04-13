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
  expressway: string
  entryId: number | null
  exitId: number | null
  fee: number | null
  entryName: string
  exitName: string
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

const vehicleClass = computed(() =>
  fuelStore.activeVehicle?.type === 'truck' ? 2 : 1,
)

const vehicleClassLabel = computed(() =>
  vehicleClass.value === 2 ? 'Class 2 (truck)' : 'Class 1 (car/SUV)',
)

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

function createRow(): TollRow {
  return {
    expressway: '',
    entryId: null,
    exitId: null,
    fee: null,
    entryName: '',
    exitName: '',
    loading: false,
    notFound: false,
  }
}

const rows = ref<TollRow[]>([createRow()])

function addRow() {
  rows.value.push(createRow())
}

function removeRow(index: number) {
  rows.value.splice(index, 1)
  emitToll()
}

function pointsForExpressway(expressway: string): TollPoint[] {
  return tollPoints.value.filter((p) => p.expressway === expressway)
}

function exitPointsForRow(row: TollRow): TollPoint[] {
  return pointsForExpressway(row.expressway).filter((p) => p.id !== row.entryId)
}

function onExpresswayChange(row: TollRow) {
  row.entryId = null
  row.exitId = null
  row.fee = null
  row.entryName = ''
  row.exitName = ''
  row.notFound = false
  emitToll()
}

function onEntryChange(row: TollRow) {
  row.exitId = null
  row.fee = null
  row.entryName = ''
  row.exitName = ''
  row.notFound = false
  emitToll()
}

async function onExitChange(row: TollRow) {
  row.fee = null
  row.notFound = false

  if (!row.entryId || !row.exitId) {
    emitToll()
    return
  }

  row.loading = true
  try {
    const result = await $fetch<{
      found: boolean
      fee: number
      entryName: string
      exitName: string
      expressway: string
      expresswayName: string
    }>('/api/toll-fee', {
      params: {
        entryId: row.entryId,
        exitId: row.exitId,
        vehicleClass: vehicleClass.value,
      },
    })
    row.notFound = !result.found
    if (result.found) {
      row.fee = result.fee
      row.entryName = result.entryName
      row.exitName = result.exitName
    }
  } finally {
    row.loading = false
    emitToll()
  }
}

function emitToll() {
  const completedRows = rows.value.filter((r) => r.fee !== null)
  if (completedRows.length === 0) {
    emit('update:toll', null)
    return
  }

  const totalFee = completedRows.reduce((sum, r) => sum + (r.fee ?? 0), 0)

  const expresswayNames = [...new Set(completedRows.map((r) => expressways.value[r.expressway] ?? r.expressway))]
  const routeLabel = expresswayNames.join(' + ')

  const breakdown: TollBreakdownItem[] = completedRows.map((r) => ({
    entryPoint: r.entryName,
    exitPoint: r.exitName,
    expressway: r.expressway,
    expresswayName: expressways.value[r.expressway] ?? r.expressway,
    fee: r.fee!,
  }))

  emit('update:toll', {
    estimatedToll: totalFee,
    note: `Via ${routeLabel} — ${vehicleClassLabel.value}`,
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
      Select your expressway, then entry and exit points. Add a row for each expressway you'll use.
    </p>

    <div v-if="dataError" class="text-xs text-red-500">
      Failed to load toll data.
    </div>

    <div v-else-if="!dataLoaded" class="text-xs text-gray-400 animate-pulse">
      Loading toll data…
    </div>

    <template v-else>
      <div
        v-for="(row, index) in rows"
        :key="index"
        class="space-y-3 pb-4 border-b border-gray-100 dark:border-surface-700 last:border-0 last:pb-0"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-400 uppercase">
            {{ rows.length > 1 ? `Segment ${index + 1}` : 'Toll road' }}
          </span>
          <button
            v-if="rows.length > 1"
            class="text-xs text-red-400 hover:text-red-500"
            @click="removeRow(index)"
          >
            Remove
          </button>
        </div>

        <!-- Expressway -->
        <div>
          <label class="label">Expressway</label>
          <select
            v-model="row.expressway"
            class="input-field w-full"
            @change="onExpresswayChange(row)"
          >
            <option value="">— Select expressway —</option>
            <option v-for="(name, key) in expressways" :key="key" :value="key">
              {{ name }}
            </option>
          </select>
        </div>

        <!-- Entry & exit (only when expressway selected) -->
        <template v-if="row.expressway">
          <div>
            <label class="label">Entry point</label>
            <select
              v-model="row.entryId"
              class="input-field w-full"
              @change="onEntryChange(row)"
            >
              <option :value="null">— Select entry point —</option>
              <option v-for="p in pointsForExpressway(row.expressway)" :key="p.id" :value="p.id">
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
              <option :value="null">— Select exit point —</option>
              <option v-for="p in exitPointsForRow(row)" :key="p.id" :value="p.id">
                {{ p.name }}
              </option>
            </select>
          </div>

          <!-- Row result -->
          <div class="text-sm min-h-[1.25rem]">
            <span v-if="row.loading" class="text-xs text-gray-400 animate-pulse">Looking up fee…</span>
            <span v-else-if="row.notFound" class="text-xs text-amber-500">
              No fee found for this pair — check toll.ph
            </span>
            <div v-else-if="row.fee !== null" class="flex justify-between items-center">
              <span class="text-xs text-gray-400">{{ row.entryName }} → {{ row.exitName }}</span>
              <span class="font-semibold text-primary-600 dark:text-primary-400">
                {{ settings.formatPeso(row.fee) }}
              </span>
            </div>
          </div>
        </template>
      </div>

      <!-- Add segment button -->
      <button
        class="w-full text-xs text-primary-600 dark:text-primary-400 border border-dashed border-primary-300 dark:border-primary-700 rounded-lg py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
        @click="addRow"
      >
        + Add another toll road
      </button>

      <!-- Grand total (when multiple rows have fees) -->
      <div
        v-if="rows.filter(r => r.fee !== null).length > 1"
        class="flex items-center justify-between border-t border-gray-100 dark:border-surface-700 pt-3"
      >
        <span class="text-xs text-gray-400">Total toll</span>
        <div class="flex items-center gap-2">
          <span class="text-xs bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full">
            exact
          </span>
          <span class="font-bold text-primary-600 dark:text-primary-400">
            {{ settings.formatPeso(rows.reduce((s, r) => s + (r.fee ?? 0), 0)) }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";
.label { @apply block text-xs font-semibold text-gray-400 uppercase mb-1; }
.input-field { @apply border border-gray-200 dark:border-surface-600 dark:bg-surface-700 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary-500; }
</style>
