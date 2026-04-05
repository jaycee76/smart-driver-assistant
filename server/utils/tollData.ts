import tollsJson from '../../public/data/tolls.json'

interface TollEntry {
  entryPointId: number
  exitPointId: number
  entryName: string
  exitName: string
  entryExpressway: string
  exitExpressway: string
  entryExpresswayName: string
  exitExpresswayName: string
  entryNetwork: string
  exitNetwork: string
  fee: number
  vehicleClass: number
  reversible: boolean
}

export interface TollPoint {
  id: number
  name: string
  expressway: string
  expresswayName?: string
  network: string
  lat?: number | null
  lng?: number | null
}

interface TollData {
  scrapedAt: string
  expressways: Record<string, string>
  vehicleClasses: number[]
  tollPoints: TollPoint[]
  entries: TollEntry[]
}

const _data = tollsJson as unknown as TollData

function loadTollData(): TollData {
  return _data
}

export function getTollPoints(): TollPoint[] {
  return loadTollData().tollPoints
}

export function getExpressways(): Record<string, string> {
  return loadTollData().expressways
}

/** Map app VehicleType to toll vehicle class number */
export function getVehicleClass(vehicleType?: string): number {
  if (vehicleType === 'truck') return 2
  return 1
}

/** Format toll points grouped by expressway — used in AI prompts (fallback only) */
export function formatTollPointsForPrompt(): string {
  const data = loadTollData()
  const byExpressway: Record<string, string[]> = {}
  for (const point of data.tollPoints) {
    if (!byExpressway[point.expressway]) byExpressway[point.expressway] = []
    byExpressway[point.expressway].push(point.name)
  }
  return Object.entries(byExpressway)
    .map(([expy, names]) => `${expy} (${data.expressways[expy] ?? expy}): ${names.join(', ')}`)
    .join('\n')
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Find the nearest geocoded toll plaza to a coordinate.
 * Optionally restrict to a specific expressway (improves accuracy when known).
 * Returns null if no geocoded plazas are available.
 */
export function findNearestPlaza(
  lat: number,
  lng: number,
  expressway?: string,
): (TollPoint & { distanceKm: number }) | null {
  const data = loadTollData()

  let candidates = data.tollPoints.filter((p) => p.lat != null && p.lng != null)
  if (!candidates.length) return null

  // Prefer plazas on the specified expressway
  if (expressway) {
    const onExpressway = candidates.filter((p) => p.expressway === expressway)
    if (onExpressway.length > 0) candidates = onExpressway
  }

  let nearest = candidates[0]
  let nearestDist = haversineKm(lat, lng, nearest.lat!, nearest.lng!)

  for (let i = 1; i < candidates.length; i++) {
    const d = haversineKm(lat, lng, candidates[i].lat!, candidates[i].lng!)
    if (d < nearestDist) {
      nearest = candidates[i]
      nearestDist = d
    }
  }

  return { ...nearest, distanceKm: nearestDist }
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, '')

function findPointByName(query: string, points: TollPoint[]): TollPoint | undefined {
  const q = normalize(query)
  return (
    points.find((p) => normalize(p.name) === q) ??
    points.find((p) => normalize(p.name).includes(q)) ??
    points.find((p) => q.includes(normalize(p.name)))
  )
}

export interface TollLookupResult {
  fee: number
  found: boolean
  entryName: string
  exitName: string
  expressway: string
  expresswayName: string
}

/** Look up the exact toll fee by numeric entry/exit point IDs */
export function lookupTollFeeById(
  entryId: number,
  exitId: number,
  vehicleClass: number,
): TollLookupResult {
  const data = loadTollData()
  const entryPoint = data.tollPoints.find((p) => p.id === entryId)
  const exitPoint = data.tollPoints.find((p) => p.id === exitId)

  if (!entryPoint || !exitPoint) {
    return { fee: 0, found: false, entryName: '', exitName: '', expressway: '', expresswayName: '' }
  }

  let match = data.entries.find(
    (e) => e.entryPointId === entryId && e.exitPointId === exitId && e.vehicleClass === vehicleClass,
  )

  if (!match) {
    match = data.entries.find(
      (e) =>
        e.reversible &&
        e.entryPointId === exitId &&
        e.exitPointId === entryId &&
        e.vehicleClass === vehicleClass,
    )
  }

  if (!match && vehicleClass !== 1) {
    match = data.entries.find(
      (e) => e.entryPointId === entryId && e.exitPointId === exitId && e.vehicleClass === 1,
    )
  }

  if (!match) {
    return {
      fee: 0,
      found: false,
      entryName: entryPoint.name,
      exitName: exitPoint.name,
      expressway: entryPoint.expressway,
      expresswayName: data.expressways[entryPoint.expressway] ?? entryPoint.expressway,
    }
  }

  return {
    fee: match.fee,
    found: true,
    entryName: entryPoint.name,
    exitName: exitPoint.name,
    expressway: match.entryExpressway,
    expresswayName:
      match.entryExpresswayName ||
      data.expressways[match.entryExpressway] ||
      match.entryExpressway,
  }
}
export function lookupTollFee(
  entryName: string,
  exitName: string,
  vehicleClass: number,
): TollLookupResult {
  const data = loadTollData()
  const entryPoint = findPointByName(entryName, data.tollPoints)
  const exitPoint = findPointByName(exitName, data.tollPoints)

  if (!entryPoint || !exitPoint) {
    return { fee: 0, found: false, entryName, exitName, expressway: '', expresswayName: '' }
  }

  // Try direct match
  let match = data.entries.find(
    (e) =>
      e.entryPointId === entryPoint.id &&
      e.exitPointId === exitPoint.id &&
      e.vehicleClass === vehicleClass,
  )

  // Try reversed (reversible routes)
  if (!match) {
    match = data.entries.find(
      (e) =>
        e.reversible &&
        e.entryPointId === exitPoint.id &&
        e.exitPointId === entryPoint.id &&
        e.vehicleClass === vehicleClass,
    )
  }

  // Class fallback to class 1
  if (!match && vehicleClass !== 1) {
    match = data.entries.find(
      (e) =>
        e.entryPointId === entryPoint.id &&
        e.exitPointId === exitPoint.id &&
        e.vehicleClass === 1,
    )
  }

  if (!match) {
    return {
      fee: 0,
      found: false,
      entryName: entryPoint.name,
      exitName: exitPoint.name,
      expressway: entryPoint.expressway,
      expresswayName: data.expressways[entryPoint.expressway] ?? entryPoint.expressway,
    }
  }

  return {
    fee: match.fee,
    found: true,
    entryName: entryPoint.name,
    exitName: exitPoint.name,
    expressway: match.entryExpressway,
    expresswayName:
      match.entryExpresswayName || data.expressways[match.entryExpressway] || match.entryExpressway,
  }
}
