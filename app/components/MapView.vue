<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { SpeedInterval } from '~/types/maps'

const props = defineProps<{
  polyline?: string
  speedIntervals?: SpeedInterval[]
  origin?: { lat: number; lng: number; label: string }
  destination?: { lat: number; lng: number; label: string }
}>()

const config = useRuntimeConfig()
const { loadMaps, isLoaded, loadError } = useGoogleMaps()

const mapRef = ref<HTMLDivElement | null>(null)

let map: google.maps.Map | null = null
let activePolylines: google.maps.Polyline[] = []
let activeMarkers: google.maps.Marker[] = []

const trafficColors: Record<SpeedInterval['speed'], string> = {
  light: '#00C2FF',    // blue
  moderate: '#F97316', // orange
  heavy: '#EF4444',    // red
}

function clearRoute(): void {
  activePolylines.forEach((p) => p.setMap(null))
  activePolylines = []
  activeMarkers.forEach((m) => m.setMap(null))
  activeMarkers = []
}

function drawRoute(): void {
  if (!map || !props.polyline) return

  clearRoute()

  const path = google.maps.geometry.encoding.decodePath(props.polyline)

  if (props.speedIntervals?.length) {
    // Render one polyline segment per traffic interval
    for (const interval of props.speedIntervals) {
      // Include one point of overlap to avoid gaps between segments
      const segment = path.slice(interval.startIndex, interval.endIndex + 1)
      if (segment.length < 2) continue

      activePolylines.push(
        new google.maps.Polyline({
          path: segment,
          strokeColor: trafficColors[interval.speed],
          strokeWeight: 5,
          strokeOpacity: 0.9,
          map,
        }),
      )
    }
  } else {
    // No traffic data — draw a solid accent-colored route
    activePolylines.push(
      new google.maps.Polyline({
        path,
        strokeColor: '#00C2FF',
        strokeWeight: 5,
        strokeOpacity: 0.9,
        map,
      }),
    )
  }

  if (props.origin) {
    activeMarkers.push(
      new google.maps.Marker({
        position: { lat: props.origin.lat, lng: props.origin.lng },
        map,
        label: { text: 'A', color: '#fff', fontWeight: 'bold' },
        title: props.origin.label,
      }),
    )
  }

  if (props.destination) {
    activeMarkers.push(
      new google.maps.Marker({
        position: { lat: props.destination.lat, lng: props.destination.lng },
        map,
        label: { text: 'B', color: '#fff', fontWeight: 'bold' },
        title: props.destination.label,
      }),
    )
  }

  const bounds = new google.maps.LatLngBounds()
  path.forEach((point) => bounds.extend(point))
  map.fitBounds(bounds)
}

async function initMap(): Promise<void> {
  if (!mapRef.value) return
  await loadMaps()

  map = new google.maps.Map(mapRef.value, {
    center: { lat: 14.5995, lng: 120.9842 }, // Manila
    zoom: 13,
    mapTypeId: 'roadmap',
    gestureHandling: 'greedy',
  })

  if (props.polyline) drawRoute()
}

onMounted(() => {
  initMap()
})

watch(() => props.polyline, (val) => {
  if (val) {
    drawRoute()
  } else {
    clearRoute()
    map?.setCenter({ lat: 14.5995, lng: 120.9842 })
    map?.setZoom(13)
  }
})
</script>

<template>
  <div class="relative w-full h-[400px] md:h-[500px] lg:h-full lg:min-h-[500px] rounded-xl overflow-hidden">
    <!-- Missing key setup card -->
    <div
      v-if="!config.public.googleMapsPublicKey"
      class="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-xl"
    >
      <div class="text-center px-6 py-8 max-w-sm">
        <p class="text-sm text-gray-300 font-medium mb-1">Map not configured</p>
        <p class="text-xs text-gray-500">
          Add <code class="bg-gray-700 px-1 rounded">NUXT_PUBLIC_GOOGLE_MAPS_PUBLIC_KEY</code> to your
          <code class="bg-gray-700 px-1 rounded">.env</code> file to enable the map.
        </p>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div
      v-else-if="!isLoaded && !loadError"
      class="absolute inset-0 animate-pulse bg-gray-700 rounded-xl"
    />

    <!-- Error state -->
    <div
      v-else-if="loadError"
      class="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-xl"
    >
      <div class="text-center px-6">
        <p class="text-sm text-red-400 mb-3">Map failed to load. Check your API key.</p>
        <button
          class="text-xs bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
          @click="initMap"
        >
          Retry
        </button>
      </div>
    </div>

    <!-- Map container -->
    <div ref="mapRef" class="w-full h-full" />

    <!-- Traffic legend (shown only when route has traffic intervals) -->
    <div
      v-if="speedIntervals?.length"
      class="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs rounded-lg px-3 py-2 space-y-1"
    >
      <div class="flex items-center gap-2">
        <span class="w-3 h-1.5 rounded-full bg-[#00C2FF] inline-block" />
        Light traffic
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-1.5 rounded-full bg-[#F97316] inline-block" />
        Moderate traffic
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-1.5 rounded-full bg-[#EF4444] inline-block" />
        Heavy traffic
      </div>
    </div>
  </div>
</template>
