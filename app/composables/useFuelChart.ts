import type { FuelLog } from '~/types'
import type { ChartData } from 'chart.js'

/**
 * Transforms fuelLogs into Chart.js datasets for price history,
 * spend history, and efficiency trend charts.
 */
export function useFuelChart(logs: FuelLog[]) {
  const sorted = [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  const labels = sorted.map((l) =>
    new Date(l.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
  )

  const priceHistoryData: ChartData<'line'> = {
    labels,
    datasets: [
      {
        label: 'Price per Liter (₱)',
        data: sorted.map((l) => l.pricePerLiter),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  }

  const spendHistoryData: ChartData<'bar'> = {
    labels,
    datasets: [
      {
        label: 'Total Cost (₱)',
        data: sorted.map((l) => l.totalCost),
        backgroundColor: 'rgba(249, 115, 22, 0.75)',
        borderColor: 'rgb(249, 115, 22)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }

  const efficiencyTrendData: ChartData<'line'> = {
    labels,
    datasets: [
      {
        label: 'Liters per Fill-up',
        data: sorted.map((l) => l.liters),
        borderColor: 'rgb(34, 197, 94)',
        tension: 0.3,
        pointRadius: 4,
      },
    ],
  }

  return { priceHistoryData, spendHistoryData, efficiencyTrendData }
}
