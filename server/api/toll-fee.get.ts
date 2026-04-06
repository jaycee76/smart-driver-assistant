import { lookupTollFeeById, getVehicleClass } from '../utils/tollData'
import type { TollLookupResult } from '../utils/tollData'

export default defineEventHandler((event): TollLookupResult => {
  const q = getQuery(event)
  const entryId = Number(q.entryId)
  const exitId = Number(q.exitId)
  const vehicleClass = q.vehicleClass ? Number(q.vehicleClass) : getVehicleClass()

  if (!entryId || !exitId) {
    throw createError({ statusCode: 400, statusMessage: 'entryId and exitId required' })
  }

  return lookupTollFeeById(entryId, exitId, vehicleClass)
})
