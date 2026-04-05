<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps<{ text: string; isLoading?: boolean }>()

const displayed = ref('')
let timer: ReturnType<typeof setInterval> | null = null

watch(
  () => props.text,
  (val) => {
    displayed.value = ''
    if (!val) return
    let i = 0
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
      i++
      displayed.value = val.slice(0, i)
      if (i >= val.length && timer) {
        clearInterval(timer)
        timer = null
      }
    }, 12)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-surface-700">
    <div class="flex items-center gap-2 mb-4">
      <span class="text-xl">💡</span>
      <h3 class="font-semibold">AI Fuel Insight</h3>
      <span class="text-xs bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300 px-2 py-0.5 rounded-full ml-1">
        Gemini
      </span>
    </div>
    <div v-if="isLoading" class="space-y-2 animate-pulse">
      <div class="h-3 bg-gray-200 dark:bg-surface-700 rounded w-full" />
      <div class="h-3 bg-gray-200 dark:bg-surface-700 rounded w-5/6" />
      <div class="h-3 bg-gray-200 dark:bg-surface-700 rounded w-4/6" />
      <div class="h-3 bg-gray-200 dark:bg-surface-700 rounded w-3/4" />
    </div>
    <p v-else class="text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
      {{ displayed }}<span v-if="displayed.length < text.length" class="animate-pulse text-primary-500">|</span>
    </p>
  </div>
</template>
