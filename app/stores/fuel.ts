import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FuelLog, Vehicle } from '~/types'

export const useFuelStore = defineStore(
  'fuel',
  () => {
    const fuelLogs = ref<FuelLog[]>([])
    const vehicles = ref<Vehicle[]>([])
    const activeVehicleId = ref<string>('')

    const activeVehicle = computed(() =>
      vehicles.value.find((v) => v.id === activeVehicleId.value) ?? null,
    )

    /** Add a new fuel log entry */
    function addFuelLog(log: FuelLog): void {
      fuelLogs.value.unshift(log)
    }

    /** Remove a fuel log by id */
    function deleteFuelLog(id: string): void {
      fuelLogs.value = fuelLogs.value.filter((l) => l.id !== id)
    }

    /** Update an existing fuel log */
    function updateFuelLog(updated: FuelLog): void {
      const idx = fuelLogs.value.findIndex((l) => l.id === updated.id)
      if (idx !== -1) fuelLogs.value[idx] = updated
    }

    /** Add a vehicle and set it as active if it's the first */
    function addVehicle(vehicle: Vehicle): void {
      vehicles.value.push(vehicle)
      if (!activeVehicleId.value) activeVehicleId.value = vehicle.id
    }

    /** Remove a vehicle and all its associated fuel logs */
    function deleteVehicle(id: string): void {
      vehicles.value = vehicles.value.filter((v) => v.id !== id)
      fuelLogs.value = fuelLogs.value.filter((l) => l.vehicleId !== id)
      if (activeVehicleId.value === id) {
        activeVehicleId.value = vehicles.value[0]?.id ?? ''
      }
    }

    /** Set the active vehicle */
    function setActiveVehicle(id: string): void {
      activeVehicleId.value = id
    }

    /** Get the last logged price per liter for a vehicle */
    function getLastPrice(vehicleId: string): number {
      const log = fuelLogs.value.find((l) => l.vehicleId === vehicleId)
      return log?.pricePerLiter ?? 0
    }

    /**
     * Get total spend for a given month
     * @param month - format: 'YYYY-MM'
     */
    function getMonthlySpend(month: string): number {
      return fuelLogs.value
        .filter((l) => l.date.startsWith(month))
        .reduce((sum, l) => sum + l.totalCost, 0)
    }

    /**
     * Calculate average efficiency for a vehicle from odometer readings.
     * Falls back to the vehicle's preset efficiency if insufficient data.
     */
    function getAverageEfficiency(vehicleId: string): number {
      const vehicle = vehicles.value.find((v) => v.id === vehicleId)
      const logs = fuelLogs.value
        .filter((l) => l.vehicleId === vehicleId && l.odometer !== undefined)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      if (logs.length < 2) return vehicle?.efficiency ?? 0

      let totalKm = 0
      let totalLiters = 0
      for (let i = 1; i < logs.length; i++) {
        const km = (logs[i].odometer ?? 0) - (logs[i - 1].odometer ?? 0)
        if (km > 0) {
          totalKm += km
          totalLiters += logs[i].liters
        }
      }
      return totalLiters > 0 ? totalKm / totalLiters : vehicle?.efficiency ?? 0
    }

    return {
      fuelLogs,
      vehicles,
      activeVehicleId,
      activeVehicle,
      addFuelLog,
      deleteFuelLog,
      updateFuelLog,
      addVehicle,
      deleteVehicle,
      setActiveVehicle,
      getLastPrice,
      getMonthlySpend,
      getAverageEfficiency,
    }
  },
  { persist: true },
)
