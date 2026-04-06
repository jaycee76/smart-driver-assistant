import type { Ref } from 'vue'
import type { PlaceResult } from '~/types/maps'

/**
 * usePlacesAutocomplete — wraps Google Places Autocomplete for a single input.
 *
 * Usage:
 *   const inputRef = ref<HTMLInputElement | null>(null)
 *   const { selectedPlace, initAutocomplete } = usePlacesAutocomplete(inputRef)
 *
 *   onMounted(async () => {
 *     await loadMaps()      // call useGoogleMaps().loadMaps() first
 *     initAutocomplete()    // then initialize autocomplete on the input
 *   })
 *
 * - Restricted to Philippines (country: 'ph').
 * - selectedPlace updates reactively when the user picks a suggestion.
 * - No crash if the user types without selecting — selectedPlace stays null.
 */
export function usePlacesAutocomplete(inputRef: Ref<HTMLInputElement | null>) {
  const selectedPlace = ref<PlaceResult | null>(null)

  /**
   * Attach a Places Autocomplete instance to the bound input element.
   * Must be called after loadMaps() resolves.
   */
  function initAutocomplete(): void {
    if (!inputRef.value) return

    const ac = new google.maps.places.Autocomplete(inputRef.value, {
      componentRestrictions: { country: 'ph' },
      fields: ['geometry', 'formatted_address', 'place_id'],
    })

    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (!place.geometry?.location) return

      selectedPlace.value = {
        label: place.formatted_address ?? '',
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        placeId: place.place_id ?? '',
      }
    })
  }

  return { selectedPlace, initAutocomplete }
}
