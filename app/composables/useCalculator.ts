import type { CalculatorResult } from '~/types'

interface CalculatorInput {
  distanceKm: number
  efficiencyKmL: number
  pricePerLiter: number
  trips?: number // total trip count for monthly cost
}

/**
 * Calculates fuel cost for a trip or monthly estimate.
 * @param input - distance, vehicle efficiency, fuel price, optional trip count
 */
export function useCalculator(input: CalculatorInput): CalculatorResult {
  const { distanceKm, efficiencyKmL, pricePerLiter, trips } = input

  if (efficiencyKmL <= 0 || pricePerLiter <= 0 || distanceKm <= 0) {
    return { litersNeeded: 0, totalCost: 0, costPerKm: 0 }
  }

  const litersNeeded = distanceKm / efficiencyKmL
  const totalCost = litersNeeded * pricePerLiter
  const costPerKm = pricePerLiter / efficiencyKmL
  const monthlyCost = trips !== undefined ? totalCost * trips : undefined

  return {
    litersNeeded: Math.round(litersNeeded * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    costPerKm: Math.round(costPerKm * 100) / 100,
    monthlyCost: monthlyCost !== undefined ? Math.round(monthlyCost * 100) / 100 : undefined,
  }
}
