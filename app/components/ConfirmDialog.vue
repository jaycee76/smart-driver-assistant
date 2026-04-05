<script setup lang="ts">
defineProps<{
  title: string
  message: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-sm p-6 shadow-xl">
      <h2 class="text-base font-bold mb-2">{{ title }}</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">{{ message }}</p>
      <div class="flex gap-3">
        <button
          class="flex-1 border border-gray-200 dark:border-surface-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          class="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
          @click="emit('confirm')"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>
