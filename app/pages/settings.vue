<script setup lang="ts">
import { ref } from 'vue'
import { useFuelStore } from '~/stores/fuel'
import { useSettingsStore } from '~/stores/settings'

const fuelStore = useFuelStore()
const settings = useSettingsStore()

const importError = ref<string | null>(null)
const importSuccess = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function exportData() {
  const payload = JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    vehicles: fuelStore.vehicles,
    fuelLogs: fuelStore.fuelLogs,
    activeVehicleId: fuelStore.activeVehicleId,
  }, null, 2)

  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `litro-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function isValidVehicle(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.efficiency === 'number' &&
    typeof o.year === 'number'
}

function isValidFuelLog(l: unknown): boolean {
  if (!l || typeof l !== 'object') return false
  const o = l as Record<string, unknown>
  return typeof o.id === 'string' &&
    typeof o.vehicleId === 'string' &&
    typeof o.date === 'string' &&
    typeof o.totalCost === 'number'
}

function onFileSelected(e: Event) {
  importError.value = null
  importSuccess.value = false

  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    importError.value = 'File is too large to be a valid backup.'
    return
  }

  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target?.result as string)

      if (!Array.isArray(data.vehicles) || !Array.isArray(data.fuelLogs)) {
        importError.value = 'Invalid backup file.'
        return
      }

      if (!data.vehicles.every(isValidVehicle)) {
        importError.value = 'Backup contains invalid vehicle data.'
        return
      }

      if (!data.fuelLogs.every(isValidFuelLog)) {
        importError.value = 'Backup contains invalid fuel log data.'
        return
      }

      fuelStore.vehicles = data.vehicles
      fuelStore.fuelLogs = data.fuelLogs
      fuelStore.activeVehicleId = data.activeVehicleId ?? data.vehicles[0]?.id ?? ''
      importSuccess.value = true
    } catch {
      importError.value = 'Could not read file. Make sure it is a valid Litro backup.'
    } finally {
      // Reset input so the same file can be re-selected if needed
      if (fileInputRef.value) fileInputRef.value.value = ''
    }
  }
  reader.readAsText(file)
}
</script>

<template>
  <div class="p-4 md:p-8 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-8">Settings</h1>

    <!-- Appearance -->
    <section class="mb-8">
      <h2 class="section-title">Appearance</h2>
      <div class="card flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">Dark Mode</p>
          <p class="text-xs text-gray-400 mt-0.5">Switch between light and dark theme</p>
        </div>
        <button
          role="switch"
          :aria-checked="settings.darkMode"
          class="relative w-11 h-6 rounded-full transition-colors shrink-0"
          :class="settings.darkMode ? 'bg-primary-600' : 'bg-gray-300 dark:bg-surface-600'"
          @click="settings.darkMode = !settings.darkMode"
        >
          <span
            class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
            :class="settings.darkMode ? 'translate-x-5' : 'translate-x-0'"
          />
        </button>
      </div>
    </section>

    <!-- Data & Backup -->
    <section>
      <h2 class="section-title">Data & Backup</h2>
      <div class="card space-y-5">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Your data is stored locally on this device. Export a backup file to keep a copy or transfer to another device.
        </p>

        <!-- Export -->
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-medium">Export Data</p>
            <p class="text-xs text-gray-400 mt-0.5">Download all vehicles and fuel logs as a JSON file</p>
          </div>
          <button
            class="shrink-0 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            @click="exportData"
          >
            Export
          </button>
        </div>

        <div class="border-t border-gray-100 dark:border-surface-700" />

        <!-- Import -->
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-medium">Import Data</p>
            <p class="text-xs text-gray-400 mt-0.5">Restore from a backup file. This will replace all current data.</p>
          </div>
          <button
            class="shrink-0 border border-gray-200 dark:border-surface-600 hover:bg-gray-50 dark:hover:bg-surface-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            @click="fileInputRef?.click()"
          >
            Import
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept=".json"
            class="hidden"
            @change="onFileSelected"
          />
        </div>

        <p v-if="importError" class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
          {{ importError }}
        </p>
        <p v-if="importSuccess" class="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-xl px-3 py-2">
          Data restored successfully.
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";
.section-title { @apply text-xs font-semibold text-gray-400 uppercase mb-3; }
.card { @apply bg-white dark:bg-surface-800 rounded-2xl p-5 border border-gray-100 dark:border-surface-700 shadow-sm; }
</style>
