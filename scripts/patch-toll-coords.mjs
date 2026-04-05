/**
 * Patches manual coordinates for toll plazas that Nominatim couldn't geocode.
 * Run with: node scripts/patch-toll-coords.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tollPath = join(__dirname, '..', 'public', 'data', 'tolls.json')

// Manual coordinates keyed by plaza ID
// Coordinates sourced from geographic knowledge of Philippine expressways
const MANUAL_COORDS = {
  // SKYWAY Stage 3 (elevated, runs BGC → NLEX Balintawak)
  9:  { lat: 14.5654, lng: 120.9984 }, // Buendia (SKYWAY3) — Buendia Ave. ramp
  10: { lat: 14.5522, lng: 120.9940 }, // Quirino (SKYWAY3) — Quirino Ave. ramp
  11: { lat: 14.5853, lng: 120.9980 }, // Nagtahan (SKYWAY3) — Nagtahan ramp
  20: { lat: 14.6450, lng: 121.0184 }, // Quezon Ave. (SKYWAY3)
  21: { lat: 14.6830, lng: 121.0010 }, // Balintawak (SKYWAY3) — north terminus
  22: { lat: 14.6910, lng: 121.0042 }, // NLEX (SKYWAY3) — NLEX–SKYWAY3 junction
  43: { lat: 14.6160, lng: 121.0089 }, // E. Rodriguez (SKYWAY3)
  44: { lat: 14.5778, lng: 120.9936 }, // Plaza Dilao (SKYWAY3) — near Paco

  // SLEX extended exits
  12: { lat: 14.3612, lng: 120.9851 }, // MCX (SLEX) — Muntinlupa-Cavite Expressway junction
  13: { lat: 14.3890, lng: 121.0362 }, // Susana Heights (SLEX)
  17: { lat: 14.3579, lng: 121.0295 }, // Southwoods (SLEX) — near Biñan/San Pedro
  18: { lat: 14.3100, lng: 121.0269 }, // Carmona (SLEX) — Carmona, Cavite
  19: { lat: 14.2950, lng: 121.0350 }, // Mamplasan (SLEX) — Biñan
  25: { lat: 14.2762, lng: 121.0367 }, // Sta. Rosa (SLEX)
  26: { lat: 14.2995, lng: 121.0450 }, // ABI/Greenfield (SLEX) — near Biñan
  27: { lat: 14.2350, lng: 121.1066 }, // Cabuyao (SLEX)

  // CALAX
  31: { lat: 14.2601, lng: 121.0190 }, // Sta. Rosa/Tagaytay (CALAX)
  33: { lat: 14.2181, lng: 120.9935 }, // Silang Interchange (CALAX)

  // NAIAX (Ninoy Aquino Int'l Airport Expressway)
  34: { lat: 14.5086, lng: 121.0176 }, // Andrews Ave./Terminal 3 (NAIAX)
  35: { lat: 14.5077, lng: 121.0198 }, // NAIA Terminal 3 (NAIAX)
  36: { lat: 14.5566, lng: 120.9896 }, // Aurora Blvd. (Tramo) (NAIAX)
  37: { lat: 14.5109, lng: 121.0007 }, // NAIA Terminal 1 (NAIAX)
  38: { lat: 14.5074, lng: 121.0107 }, // NAIA Terminal 2 (NAIAX)
  39: { lat: 14.5226, lng: 120.9850 }, // CAVITEX (NAIAX)
  40: { lat: 14.5265, lng: 120.9800 }, // Entertainment City (NAIAX)
  41: { lat: 14.5395, lng: 120.9863 }, // Macapagal Blvd. (NAIAX)
  42: { lat: 14.5224, lng: 121.0036 }, // Skyway (NAIAX) — junction with SKYWAY
  102: { lat: 14.5224, lng: 121.0036 }, // NAIAX (SKYWAY) — same junction

  // STAR Tollway (south of Manila, Batangas)
  46: { lat: 14.1019, lng: 121.1447 }, // Sto. Tomas (STAR)
  49: { lat: 13.7950, lng: 121.1480 }, // Sto. Toribio (STAR) — near Bauan, Batangas

  // NLEX northern exits
  58: { lat: 14.6992, lng: 120.9630 }, // Valenzuela (NLEX)
  63: { lat: 14.7480, lng: 120.9350 }, // Ciudad de Victoria (NLEX) — near Meycauayan
  75: { lat: 15.1220, lng: 120.5870 }, // Sta. Ines (NLEX) — near San Fernando, Pampanga

  // SCTEX (Subic-Clark-Tarlac Expressway)
  81: { lat: 15.2340, lng: 120.5880 }, // Mabalacat (Mabiga) (SCTEX)
  84: { lat: 15.3800, lng: 120.5470 }, // Bamban/New Clark City (SCTEX)

  // TPLEX (Tarlac-Pangasinan-La Union Expressway)
  88: { lat: 15.4510, lng: 120.5770 }, // La Paz (TPLEX)
  90: { lat: 15.6165, lng: 120.5985 }, // Gerona (TPLEX)
  96: { lat: 16.0400, lng: 120.5490 }, // Pozorrubbio (TPLEX)
  98: { lat: 16.1980, lng: 120.4640 }, // Rosario/Baguio (TPLEX)

  // NLEX Connector (elevated, NLEX to SKYWAY3 via Manila)
  103: { lat: 14.6350, lng: 120.9873 }, // C-3 Road/5th Ave. (NLEX CONN)
  104: { lat: 14.6120, lng: 121.0126 }, // España (NLEX CONN)
  105: { lat: 14.6250, lng: 121.0121 }, // Magsaysay (NLEX CONN)

  // NLEX Harbor Link
  107: { lat: 14.6320, lng: 120.9750 }, // C-3 Road/5th Ave. (NLEX HARBOR)
  109: { lat: 14.5850, lng: 120.9660 }, // R-10/Port of Manila (NLEX HARBOR)

  // CAVITEX
  111: { lat: 14.4538, lng: 120.9952 }, // Sucat Rd./Dr. A. Santos Ave. (CAVITEX)
  112: { lat: 14.4890, lng: 121.0068 }, // C5 Rd. Ext./C.P. Garcia (CAVITEX)
}

const data = JSON.parse(readFileSync(tollPath, 'utf-8'))

let patched = 0
for (const point of data.tollPoints) {
  if ((point.lat == null) && MANUAL_COORDS[point.id]) {
    const { lat, lng } = MANUAL_COORDS[point.id]
    point.lat = lat
    point.lng = lng
    patched++
    console.log(`  Patched: ${point.name} (${point.expressway}) → ${lat}, ${lng}`)
  }
}

writeFileSync(tollPath, JSON.stringify(data, null, 2), 'utf-8')

const geocodedCount = data.tollPoints.filter((p) => p.lat != null).length
console.log(`\nPatched ${patched} plazas`)
console.log(`Coverage: ${geocodedCount}/${data.tollPoints.length} plazas now have coordinates`)
