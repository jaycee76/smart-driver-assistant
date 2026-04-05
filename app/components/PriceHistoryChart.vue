<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { useFuelChart } from '~/composables/useFuelChart'
import type { FuelLog } from '~/types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps<{ logs: FuelLog[] }>()

const chartData = computed(() => useFuelChart(props.logs).priceHistoryData)

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: { y: number } }) => ` ₱${ctx.parsed.y.toFixed(2)}/L`,
      },
    },
  },
  scales: {
    y: {
      ticks: {
        callback: (val: number | string) => `₱${val}`,
        color: '#9ca3af',
      },
      grid: { color: 'rgba(156,163,175,0.1)' },
    },
    x: {
      ticks: { color: '#9ca3af' },
      grid: { display: false },
    },
  },
}
</script>

<template>
  <div v-if="logs.length < 2" class="text-center py-8 text-gray-400 text-sm">
    Log at least 2 fill-ups to see the price history chart.
  </div>
  <div v-else style="height: 200px">
    <Line :data="chartData" :options="(chartOptions as never)" />
  </div>
</template>
