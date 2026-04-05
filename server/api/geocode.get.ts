import type { GeocodeFeature } from '~/types'

interface ORSGeocodeResponse {
  features: Array<{
    properties: { label: string }
    geometry: { coordinates: [number, number] }
  }>
}

export default defineEventHandler(async (event): Promise<{ features: GeocodeFeature[] }> => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const q = query.q as string | undefined

  if (!q?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'q parameter required' })
  }

  const res = await $fetch<ORSGeocodeResponse>(
    `https://api.openrouteservice.org/geocode/search?api_key=${config.orsApiKey}&text=${encodeURIComponent(q)}&boundary.country=PH&size=5`,
  )

  return {
    features: res.features.map((f) => ({
      label: f.properties.label,
      coordinates: f.geometry.coordinates,
    })),
  }
})
