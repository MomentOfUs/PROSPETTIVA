import { ref, watch } from 'vue'

const STORAGE_PREFIX = 'manga_widget_collapsed_'

/**
 * Composable for collapsible widget cards.
 * Persists collapsed state to localStorage per widget id.
 *
 * @param widgetId - Unique identifier for the widget (e.g. 'clock', 'weather')
 * @param defaultCollapsed - Initial state if no saved preference
 */
export function useCollapsible(widgetId: string, defaultCollapsed = false) {
  const storageKey = `${STORAGE_PREFIX}${widgetId}`

  const stored = localStorage.getItem(storageKey)
  const initial = stored !== null ? stored === 'true' : defaultCollapsed

  const collapsed = ref(initial)

  watch(collapsed, (val) => {
    localStorage.setItem(storageKey, String(val))
  })

  function toggle() {
    collapsed.value = !collapsed.value
  }

  return { collapsed, toggle }
}
