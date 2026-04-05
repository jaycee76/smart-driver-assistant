<script setup lang="ts">
import type { EfficiencySource } from '~/types'

defineProps<{ source: EfficiencySource }>()

const labelMap: Record<EfficiencySource, string> = {
  'ai-estimated': '🤖 AI Estimate',
  preset: '📋 Preset',
  manual: '✏️ Manual',
}
const colorMap: Record<EfficiencySource, string> = {
  'ai-estimated': 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  preset: 'bg-gray-100 text-gray-600 dark:bg-surface-700 dark:text-surface-300',
  manual: 'bg-accent-100 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400',
}
</script>

<template>
  <span :class="['inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full', colorMap[source]]">
    {{ labelMap[source] }}
  </span>
</template>
