export type FuelType = 'Ron91' | 'Ron95' | 'Ron97' | 'Diesel'
export type VehicleType = 'car' | 'motorcycle' | 'truck' | 'bus' | 'van'
export type EfficiencySource = 'ai-estimated' | 'preset' | 'manual'

export interface FuelLog {
  id: string
  date: string // ISO 8601
  vehicleId: string
  fuelType: FuelType
  pricePerLiter: number // ₱
  liters: number
  totalCost: number // ₱
  odometer?: number
  station?: string
  notes?: string
}

export interface Vehicle {
  id: string
  name: string
  brand: string
  model: string
  year: number
  type: VehicleType
  fuelType: FuelType
  efficiency: number // km/L
  efficiencySource: EfficiencySource
  tankCapacity: number // liters
}

export interface VehicleLookupResult {
  efficiency: number
  fuelType: FuelType
  tankCapacity: number
  notes: string
  source: string
}

export interface VehiclePreset {
  name: string
  brand: string
  model: string
  type: VehicleType
  fuelType: FuelType
  efficiency: number
  tankCapacity: number
}

export interface TollSegment {
  entryCoord: [number, number] // [lng, lat]
  exitCoord: [number, number] // [lng, lat]
}

export interface RouteResult {
  distanceKm: number
  durationMin: number
  geometry: GeoJSON.LineString
  hasTolls: boolean
  tollSegments?: TollSegment[]
}

export interface TollBreakdownItem {
  entryPoint: string
  exitPoint: string
  expressway: string
  expresswayName: string
  fee: number
}

export interface TollEstimate {
  estimatedToll: number
  note: string
  /** true = exact fee from toll.ph data; false = AI estimate */
  exact?: boolean
  breakdown?: TollBreakdownItem[]
}

export interface GeocodeFeature {
  label: string
  coordinates: [number, number] // [lng, lat]
}

export interface CalculatorResult {
  litersNeeded: number
  totalCost: number
  monthlyCost?: number
  costPerKm: number
}

export interface ForecastResult {
  predictedPrice: number
  trend: 'up' | 'down' | 'stable'
  confidence: number
}
