import { GoogleGenAI } from '@google/genai'
import type { VehicleLookupResult } from '~/types'

interface LookupRequestBody {
  query: string
}

const FUEL_TYPES = ['Ron91', 'Ron95', 'Ron97', 'Diesel'] as const

export default defineEventHandler(async (event): Promise<VehicleLookupResult | { error: string }> => {
  const config = useRuntimeConfig()
  const body = await readBody<LookupRequestBody>(event)

  if (!body.query?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'query is required' })
  }

  if (!config.geminiApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_GEMINI_API_KEY is not configured' })
  }

  const prompt = `You are a vehicle specification expert for the Philippine market.
Look up the real-world average fuel efficiency of: ${body.query}
Return ONLY a valid JSON object with no explanation, no markdown:
{
  "efficiency": <number in km/L>,
  "fuelType": <"Ron91"|"Ron95"|"Ron97"|"Diesel">,
  "tankCapacity": <number in liters>,
  "notes": <one short sentence about the estimate>,
  "source": "Gemma AI knowledge base"
}
Base efficiency on real-world Philippine driving conditions, not lab specs.`

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey })

  let rawText: string
  try {
    const response = await ai.models.generateContent({
      model: 'gemma-4-26b-a4b-it',
      contents: prompt,
      generationConfig: { maxOutputTokens: 1000, temperature: 1 },
    })
    rawText = response.text ?? ''
  } catch (err: unknown) {
    const apiErr = err as { status?: number; message?: string }
    console.error('[vehicle-lookup] AI error:', apiErr.status, apiErr.message)
    if (apiErr.status === 429) return { error: 'rate_limited' }
    return { error: 'lookup_failed' }
  }

  // Strip markdown fences before parsing
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```$/m, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>

    const efficiency = typeof parsed.efficiency === 'number' ? parsed.efficiency : 0
    const tankCapacity = typeof parsed.tankCapacity === 'number' ? parsed.tankCapacity : 0
    const fuelType = FUEL_TYPES.includes(parsed.fuelType as typeof FUEL_TYPES[number])
      ? (parsed.fuelType as VehicleLookupResult['fuelType'])
      : 'Ron95'
    const notes = typeof parsed.notes === 'string' ? parsed.notes : ''
    const source = typeof parsed.source === 'string' ? parsed.source : 'Gemma AI'

    if (efficiency <= 0 || tankCapacity <= 0) {
      return { error: 'lookup_failed' }
    }

    return { efficiency, fuelType, tankCapacity, notes, source }
  } catch {
    return { error: 'lookup_failed' }
  }
})
