import { GoogleGenAI } from '@google/genai'
import type { FuelLog, Vehicle } from '~/types'

interface InsightRequestBody {
  fuelLogs: FuelLog[]
  vehicle: Vehicle
}

export default defineEventHandler(async (event): Promise<{ insight: string }> => {
  const config = useRuntimeConfig()
  const body = await readBody<InsightRequestBody>(event)

  if (!body.vehicle || !Array.isArray(body.fuelLogs)) {
    throw createError({ statusCode: 400, statusMessage: 'vehicle and fuelLogs required' })
  }

  if (!config.geminiApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_GEMINI_API_KEY is not configured' })
  }

  const logs = body.fuelLogs.slice(0, 20)
  const totalSpent = logs.reduce((s, l) => s + l.totalCost, 0)
  const avgPrice =
    logs.length > 0 ? logs.reduce((s, l) => s + l.pricePerLiter, 0) / logs.length : 0

  const summary = {
    vehicle: `${body.vehicle.name} (${body.vehicle.year}), ${body.vehicle.efficiency} km/L`,
    totalLogs: logs.length,
    totalSpent: `₱${totalSpent.toFixed(2)}`,
    avgPricePerLiter: `₱${avgPrice.toFixed(2)}`,
    recentLogs: logs.slice(0, 5).map((l) => ({
      date: l.date.slice(0, 10),
      liters: l.liters,
      pricePerLiter: l.pricePerLiter,
      totalCost: l.totalCost,
      fuelType: l.fuelType,
    })),
  }

  const prompt = `You are a helpful fuel efficiency assistant for Filipino drivers.
Analyze this fuel log data and give a short, practical insight in 3-4 sentences.
Focus on: spending trend, efficiency, and one actionable tip.
Respond in a friendly, conversational tone. Use peso (₱) for currency.
Data: ${JSON.stringify(summary)}`

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey })

  try {
    const response = await ai.models.generateContent({
      model: 'gemma-4-26b-a4b-it',
      contents: prompt,
      generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
    })

    const insight = response.text?.trim() ?? ''
    if (!insight) {
      throw createError({ statusCode: 502, statusMessage: 'No response from AI model' })
    }

    return { insight }
  } catch (err: unknown) {
    const apiErr = err as { status?: number; message?: string }
    console.error('[ai-insight] AI error:', apiErr.status, apiErr.message)
    throw createError({
      statusCode: apiErr.status ?? 502,
      statusMessage: `AI error: ${apiErr.message ?? 'unknown'}`,
    })
  }
})
