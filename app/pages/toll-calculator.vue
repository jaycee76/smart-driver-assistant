<script setup lang="ts">
import { ref } from 'vue'
import type { TollEstimate } from '~/types'
import { useSettingsStore } from '~/stores/settings'

const settings = useSettingsStore()
const tollEstimate = ref<TollEstimate | null>(null)
</script>

<template>
  <div class="p-4 md:p-8 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Toll Calculator</h1>

    <TollSelector @update:toll="tollEstimate = $event" />

    <div
      v-if="tollEstimate"
      class="mt-4 bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-surface-700 space-y-3"
    >
      <p class="text-xs text-gray-400 font-semibold uppercase">Summary</p>
      <div
        v-for="item in tollEstimate.breakdown"
        :key="item.entryPoint + item.exitPoint"
        class="flex items-center justify-between text-sm"
      >
        <span class="text-gray-500 dark:text-gray-400">{{ item.expresswayName }} · {{ item.entryPoint }} → {{ item.exitPoint }}</span>
        <span class="font-medium">{{ settings.formatPeso(item.fee) }}</span>
      </div>
      <div class="flex items-center justify-between border-t border-gray-100 dark:border-surface-700 pt-3">
        <span class="text-sm font-semibold">Total toll</span>
        <span class="text-lg font-bold text-primary-600 dark:text-primary-400">
          {{ settings.formatPeso(tollEstimate.estimatedToll) }}
        </span>
      </div>
      <p class="text-xs text-gray-400">{{ tollEstimate.note }}</p>
    </div>
  </div>
</template>
