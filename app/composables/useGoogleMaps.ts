/**
 * useGoogleMaps — single source of truth for loading the Google Maps JS API.
 *
 * Usage:
 *   const { loadMaps, isLoaded, loadError } = useGoogleMaps()
 *   onMounted(async () => { await loadMaps() })
 *
 * - loadMaps() is idempotent: safe to call from multiple components.
 * - The script is loaded on demand via useScript() — never added to app.head.
 * - Requires NUXT_PUBLIC_GOOGLE_MAPS_PUBLIC_KEY in .env.
 */

let sharedPromise: Promise<typeof google> | null = null

export function useGoogleMaps() {
  const config = useRuntimeConfig()
  const isLoaded = useState<boolean>('google-maps-loaded', () => false)
  const loadError = useState<Error | null>('google-maps-error', () => null)

  const src = config.public.googleMapsPublicKey
    ? `https://maps.googleapis.com/maps/api/js?key=${config.public.googleMapsPublicKey}&libraries=places,geometry`
    : ''

  const { load } = useScript(
    { src, async: true, defer: true },
    {
      trigger: 'manual',
      use() {
        return window.google
      },
    },
  )

  /**
   * Load the Maps JS API. Safe to call multiple times — only loads once.
   * Rejects if the script fails or the public API key is missing.
   */
  async function loadMaps(): Promise<typeof google> {
    if (!config.public.googleMapsPublicKey) {
      const err = new Error('GOOGLE_MAPS_PUBLIC_KEY is not set')
      loadError.value = err
      throw err
    }

    if (sharedPromise) return sharedPromise

    sharedPromise = load()
      .then(() => {
        isLoaded.value = true
        return window.google
      })
      .catch((e: unknown) => {
        const err = e instanceof Error ? e : new Error(String(e))
        loadError.value = err
        sharedPromise = null // allow retry
        throw err
      })

    return sharedPromise
  }

  return { loadMaps, isLoaded, loadError }
}
