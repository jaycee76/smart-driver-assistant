import type { RouteResult, TollSegment } from '~/types'

interface RouteRequestBody {
  origin: [number, number] // [lng, lat]
  destination: [number, number]
  avoidTolls?: boolean
}

interface ORSDirectionsResponse {
  features: Array<{
    properties: {
      summary: { distance: number; duration: number }
      extras?: {
        tollways?: {
          values: Array<[number, number, number]> // [fromIdx, toIdx, value] — value 1 = toll
        }
      }
    }
    geometry: GeoJSON.LineString
  }>
}

export default defineEventHandler(async (event): Promise<RouteResult> => {
  const config = useRuntimeConfig()
  const body = await readBody<RouteRequestBody>(event)

  if (!config.orsApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'ORS API key not configured. Set NUXT_ORS_API_KEY in your .env file.' })
  }

  if (!body.origin || !body.destination) {
    throw createError({ statusCode: 400, statusMessage: 'origin and destination required' })
  }

  // Build options — avoidTolls
  const options: Record<string, unknown> = {}
  if (body.avoidTolls) options.avoid_features = ['tollways']

  const requestBody: Record<string, unknown> = {
    coordinates: [body.origin, body.destination],
    instructions: false,
    extra_info: ['tollways'],
    ...(Object.keys(options).length > 0 ? { options } : {}),
  }

  let orsRes: ORSDirectionsResponse

  const fetchORS = (reqBody: Record<string, unknown>) =>
    $fetch<ORSDirectionsResponse>(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      {
        method: 'POST',
        headers: {
          Authorization: config.orsApiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json, application/geo+json',
        },
        body: reqBody,
      },
    )

  try {
    orsRes = await fetchORS(requestBody)
  } catch (err: unknown) {
    const orsMsg =
      (err as { data?: { error?: { message?: string } } })?.data?.error?.message
      ?? (err instanceof Error ? err.message : String(err))
    throw createError({ statusCode: 502, statusMessage: `ORS error: ${orsMsg}` })
  }

  const feature = orsRes.features?.[0]
  if (!feature) {
    throw createError({ statusCode: 422, statusMessage: 'No route found between these locations' })
  }

  // Detect toll segments — any segment with value > 0 means toll road
  const tollValues = feature.properties.extras?.tollways?.values ?? []
  const hasTolls = tollValues.some(([, , value]) => value > 0)

  // Extract entry/exit coordinates for each contiguous toll segment
  const tollSegments: TollSegment[] = []
  if (hasTolls) {
    const coordinates = feature.geometry.coordinates as [number, number][]
    const cap = (idx: number) => Math.min(idx, coordinates.length - 1)

    const activeToll = tollValues
      .filter(([, , v]) => v > 0)
      .sort(([a], [b]) => a - b)

    if (activeToll.length > 0) {
      let groupStart = activeToll[0][0]
      let groupEnd = activeToll[0][1]

      for (let i = 1; i < activeToll.length; i++) {
        const [start, end] = activeToll[i]
        if (start <= groupEnd) {
          groupEnd = Math.max(groupEnd, end)
        } else {
          tollSegments.push({
            entryCoord: coordinates[cap(groupStart)],
            exitCoord: coordinates[cap(groupEnd)],
          })
          groupStart = start
          groupEnd = end
        }
      }
      tollSegments.push({
        entryCoord: coordinates[cap(groupStart)],
        exitCoord: coordinates[cap(groupEnd)],
      })
    }
  }

  return {
    distanceKm: feature.properties.summary.distance / 1000,
    durationMin: feature.properties.summary.duration / 60,
    geometry: feature.geometry,
    hasTolls,
    tollSegments: tollSegments.length > 0 ? tollSegments : undefined,
  }
})
