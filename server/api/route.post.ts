import type { RouteResponse, SpeedInterval } from '~/types/maps'

interface RouteRequestBody {
  origin: string // "lat,lng"
  destination: string // "lat,lng"
  departureTime?: number // Unix timestamp
  avoidTolls?: boolean
}

interface RoutesAPISpeedInterval {
  startPolylinePointIndex?: number
  endPolylinePointIndex?: number
  speed: 'NORMAL' | 'SLOW' | 'TRAFFIC_JAM'
}

interface RoutesAPIRoute {
  distanceMeters: number
  duration: string // e.g. "1234s"
  staticDuration: string
  polyline: { encodedPolyline: string }
  travelAdvisory?: {
    speedReadingIntervals?: RoutesAPISpeedInterval[]
  }
}

interface RoutesAPIResponse {
  routes: RoutesAPIRoute[]
}

function parseDurationSeconds(d: string): number {
  return parseInt(d.replace('s', ''), 10)
}

const speedMap: Record<RoutesAPISpeedInterval['speed'], SpeedInterval['speed']> = {
  NORMAL: 'light',
  SLOW: 'moderate',
  TRAFFIC_JAM: 'heavy',
}

export default defineEventHandler(async (event): Promise<RouteResponse> => {
  const config = useRuntimeConfig()

  if (!config.googleMapsApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Google Maps API key not configured. Set GOOGLE_MAPS_API_KEY in your .env file.' })
  }

  const body = await readBody<RouteRequestBody>(event)

  if (!body.origin || !body.destination) {
    throw createError({ statusCode: 400, statusMessage: 'origin and destination required' })
  }

  const [originLat, originLng] = body.origin.split(',').map(Number)
  const [destLat, destLng] = body.destination.split(',').map(Number)

  // Only send departureTime if the client provided a future timestamp.
  // Omitting it lets the Routes API use the current time internally,
  // avoiding the "Timestamp must be set to a future time" error.
  const now = Date.now()
  const departureTime = body.departureTime && body.departureTime * 1000 > now
    ? new Date(body.departureTime * 1000).toISOString()
    : undefined

  let res: RoutesAPIResponse

  try {
    res = await $fetch<RoutesAPIResponse>(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': config.googleMapsApiKey,
          'X-Goog-FieldMask': [
            'routes.duration',
            'routes.staticDuration',
            'routes.distanceMeters',
            'routes.polyline.encodedPolyline',
            'routes.travelAdvisory.speedReadingIntervals',
          ].join(','),
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
          destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          ...(departureTime ? { departureTime } : {}),
          extraComputations: ['TRAFFIC_ON_POLYLINE'],
          routeModifiers: { avoidTolls: body.avoidTolls ?? false },
        }),
      },
    )
  } catch (err: unknown) {
    const detail = (err as { data?: { error?: { message?: string; status?: string } } })?.data?.error
    const msg = detail?.message ?? (err instanceof Error ? err.message : String(err))
    console.error('[route.post] Routes API error:', detail ?? err)
    throw createError({ statusCode: 502, statusMessage: `Routes API error: ${msg}` })
  }

  if (!res.routes?.length) {
    throw createError({ statusCode: 422, statusMessage: 'No route found between these locations.' })
  }

  const route = res.routes[0]

  const durationMin = parseDurationSeconds(route.staticDuration) / 60
  const durationInTrafficMin = parseDurationSeconds(route.duration) / 60
  const distanceKm = route.distanceMeters / 1000
  const trafficDelayMin = Math.max(0, durationInTrafficMin - durationMin)
  const delayRatio = durationMin > 0 ? trafficDelayMin / durationMin : 0

  const trafficCondition: RouteResponse['trafficCondition'] =
    delayRatio < 0.1 ? 'light' : delayRatio <= 0.3 ? 'moderate' : 'heavy'

  const rawIntervals = route.travelAdvisory?.speedReadingIntervals ?? []
  const speedIntervals: SpeedInterval[] = rawIntervals.map((interval) => ({
    startIndex: interval.startPolylinePointIndex ?? 0,
    endIndex: interval.endPolylinePointIndex ?? 0,
    speed: speedMap[interval.speed],
  }))

  return {
    distanceKm,
    durationMin,
    durationInTrafficMin,
    trafficDelayMin,
    polyline: route.polyline.encodedPolyline,
    trafficCondition,
    speedIntervals: speedIntervals.length > 0 ? speedIntervals : undefined,
  }
})
