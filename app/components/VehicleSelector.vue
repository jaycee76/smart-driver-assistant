<script setup lang="ts">
import { useFuelStore } from '~/stores/fuel'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const fuelStore = useFuelStore()
</script>

<template>
  <select
    :value="props.modelValue"
    class="w-full border border-gray-200 dark:border-surface-600 dark:bg-surface-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
    @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option value="" disabled>Select vehicle</option>
    <option v-for="v in fuelStore.vehicles" :key="v.id" :value="v.id">
      {{ v.name }} ({{ v.year }}) · {{ v.efficiency }} km/L
    </option>
  </select>
</template>
