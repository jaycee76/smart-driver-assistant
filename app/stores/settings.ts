import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const darkMode = ref<boolean>(
      import.meta.client
        ? (() => {
            try {
              const s = JSON.parse(localStorage.getItem('settings') || '{}')
              return s.darkMode !== false
            } catch {
              return true
            }
          })()
        : true,
    )
    const defaultRegion = ref<string>('Metro Manila')
    /** Fixed to PHP — not user-configurable */
    const currency = ref<'PHP'>('PHP')
    /** Fixed to km — not user-configurable */
    const distanceUnit = ref<'km'>('km')

    /** Format a number as Philippine peso */
    function formatPeso(amount: number): string {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
      }).format(amount)
    }

    return { darkMode, defaultRegion, currency, distanceUnit, formatPeso }
  },
  { persist: true },
)
