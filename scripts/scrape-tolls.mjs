/**
 * Scrapes toll matrix data from toll.ph and geocodes each plaza via Nominatim.
 * Saves result to public/data/tolls.json
 * Run with: node scripts/scrape-tolls.mjs
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Nominatim requires 1 req/sec and a User-Agent
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'SmartFuelPH/1.0 (personal-project)'

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms))
}

async function geocodePlaza(name, expresswayId, expresswayName) {
  // Use expressway full name to reduce ambiguity (e.g., Buendia on SKYWAY vs SLEX)
  const query = `${name} toll plaza ${expresswayName} Philippines`
  const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ph`

  try {
    const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!resp.ok) return null
    const data = await resp.json()
    if (data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
    // Retry with shorter query if no result
    const shortUrl = `${NOMINATIM_BASE}?q=${encodeURIComponent(name + ' ' + expresswayId + ' Philippines')}&format=json&limit=1&countrycodes=ph`
    const resp2 = await fetch(shortUrl, { headers: { 'User-Agent': USER_AGENT } })
    const data2 = await resp2.json()
    if (data2[0]) {
      return { lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon) }
    }
  } catch {
    // ignore
  }
  return null
}

async function scrapeTolls() {
  console.log('Fetching toll.ph/matrix/ ...')

  const response = await fetch('https://toll.ph/matrix/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SmartFuelPH/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)

  const html = await response.text()
  console.log(`Fetched ${(html.length / 1024).toFixed(0)} KB`)

  // Data is embedded as JS object literal (not JSON): tollMatrix:[{...}]
  const startIdx = html.indexOf('tollMatrix:[')
  if (startIdx === -1) throw new Error('Could not find tollMatrix in page HTML')

  const arrStart = startIdx + 'tollMatrix:'.length
  let depth = 0
  let arrEnd = arrStart

  for (let i = arrStart; i < html.length; i++) {
    const c = html[i]
    if (c === '[' || c === '{') depth++
    else if (c === ']' || c === '}') {
      depth--
      if (depth === 0) { arrEnd = i + 1; break }
    }
  }

  if (arrEnd === arrStart) throw new Error('Failed to find end of tollMatrix array')

  const rawArr = html.substring(arrStart, arrEnd)
  // eslint-disable-next-line no-new-func
  const tollMatrix = Function('return ' + rawArr)()
  console.log(`Parsed ${tollMatrix.length} toll matrix entries`)

  // Normalize
  const entries = tollMatrix.map((item) => {
    const matrix = item.toll_matrix ?? item
    const entry = item.entryPoint ?? {}
    const exit = item.exitPoint ?? {}
    const entryExpy = item.entryExpressway ?? {}
    const exitExpy = item.exitExpressway ?? {}
    return {
      entryPointId: matrix.entryPointId ?? entry.id,
      exitPointId: matrix.exitPointId ?? exit.id,
      entryName: entry.name ?? '',
      exitName: exit.name ?? '',
      entryExpressway: entryExpy.id ?? entry.expresswayId ?? '',
      exitExpressway: exitExpy.id ?? exit.expresswayId ?? '',
      entryExpresswayName: entryExpy.name ?? '',
      exitExpresswayName: exitExpy.name ?? '',
      entryNetwork: entryExpy.tollNetworkId ?? '',
      exitNetwork: exitExpy.tollNetworkId ?? '',
      fee: parseFloat(matrix.fee ?? '0'),
      vehicleClass: matrix.vehicleClass ?? 1,
      reversible: matrix.reversible ?? false,
    }
  })

  // Unique expressways
  const expresswaysMap = {}
  for (const e of entries) {
    if (e.entryExpressway) expresswaysMap[e.entryExpressway] = e.entryExpresswayName || e.entryExpressway
    if (e.exitExpressway) expresswaysMap[e.exitExpressway] = e.exitExpresswayName || e.exitExpressway
  }

  // Unique toll points
  const pointsMap = {}
  for (const e of entries) {
    if (e.entryPointId && e.entryName) {
      pointsMap[e.entryPointId] = {
        id: e.entryPointId,
        name: e.entryName,
        expressway: e.entryExpressway,
        expresswayName: e.entryExpresswayName,
        network: e.entryNetwork,
        lat: null,
        lng: null,
      }
    }
    if (e.exitPointId && e.exitName) {
      pointsMap[e.exitPointId] = {
        id: e.exitPointId,
        name: e.exitName,
        expressway: e.exitExpressway,
        expresswayName: e.exitExpresswayName,
        network: e.exitNetwork,
        lat: null,
        lng: null,
      }
    }
  }
  const tollPoints = Object.values(pointsMap).sort((a, b) => a.id - b.id)

  // Geocode each unique toll plaza via Nominatim (rate-limited to 1/sec)
  console.log(`\nGeocoding ${tollPoints.length} unique toll plazas via Nominatim...`)
  console.log('(This takes ~2 minutes due to rate limiting)\n')

  let found = 0
  let notFound = 0

  for (let i = 0; i < tollPoints.length; i++) {
    const point = tollPoints[i]
    process.stdout.write(`  [${i + 1}/${tollPoints.length}] ${point.name} (${point.expressway})... `)

    const coords = await geocodePlaza(point.name, point.expressway, point.expresswayName)
    if (coords) {
      point.lat = coords.lat
      point.lng = coords.lng
      found++
      console.log(`✓ ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`)
    } else {
      notFound++
      console.log('✗ not found')
    }

    // Nominatim rate limit: max 1 req/sec (we fire 1-2 per plaza so wait 1.2s)
    if (i < tollPoints.length - 1) {
      await sleep(1200)
    }
  }

  console.log(`\nGeocoded: ${found} found, ${notFound} not found`)

  const vehicleClasses = [...new Set(entries.map((e) => e.vehicleClass))].sort((a, b) => a - b)

  const output = {
    scrapedAt: new Date().toISOString(),
    source: 'https://toll.ph/matrix/',
    expressways: expresswaysMap,
    vehicleClasses,
    tollPoints,
    entries,
  }

  const outDir = join(__dirname, '..', 'public', 'data')
  mkdirSync(outDir, { recursive: true })

  const outPath = join(outDir, 'tolls.json')
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')

  const geocodedCount = tollPoints.filter((p) => p.lat !== null).length
  console.log(`\nSaved → public/data/tolls.json`)
  console.log(`  Total entries      : ${entries.length}`)
  console.log(`  Expressways        : ${Object.keys(expresswaysMap).join(', ')}`)
  console.log(`  Toll points        : ${tollPoints.length}`)
  console.log(`  Geocoded with coords: ${geocodedCount}/${tollPoints.length}`)
  console.log(`  Vehicle classes    : ${vehicleClasses.join(', ')}`)
}

scrapeTolls().catch((err) => {
  console.error('\nScrape failed:', err.message)
  process.exit(1)
})
