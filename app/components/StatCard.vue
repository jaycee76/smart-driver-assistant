<script setup lang="ts">
defineProps<{
  label: string
  value: string
  sub?: string
  icon?: string
}>()
</script>

<template>
  <div class="bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-surface-700">
    <div class="flex items-start justify-between">
      <div class="min-w-0">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{{ label }}</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white truncate">{{ value }}</p>
        <p v-if="sub" class="text-xs text-gray-400 mt-1">{{ sub }}</p>
      </div>
      <span v-if="icon" class="text-2xl ml-2 shrink-0">{{ icon }}</span>
    </div>
  </div>
</template>
