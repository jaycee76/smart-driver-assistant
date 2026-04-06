export interface RouteRequest {
  origin: string // "lat,lng"
  destination: string // "lat,lng"
  departureTime?: number // Unix timestamp
  avoidTolls?: boolean
}

export interface SpeedInterval {
  startIndex: number
  endIndex: number
  speed: 'light' | 'moderate' | 'heavy'
}

export interface RouteResponse {
  distanceKm: number
  durationMin: number
  durationInTrafficMin: number
  trafficDelayMin: number
  polyline: string
  trafficCondition: 'light' | 'moderate' | 'heavy'
  speedIntervals?: SpeedInterval[]
}

export interface GeocodeResult {
  label: string
  lat: number
  lng: number
  placeId: string
}

export interface PlaceResult {
  label: string
  lat: number
  lng: number
  placeId: string
}
