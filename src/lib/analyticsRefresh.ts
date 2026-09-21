const STORAGE_KEY = "hotel_saas_analytics_refresh"

type Listener = () => void

export function onAnalyticsRefresh(fn: Listener) {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) fn()
  }
  const handleCustom = () => fn()

  window.addEventListener("storage", handleStorage)
  window.addEventListener("analyticsRefresh", handleCustom)

  return () => {
    window.removeEventListener("storage", handleStorage)
    window.removeEventListener("analyticsRefresh", handleCustom)
  }
}

export function triggerAnalyticsRefresh() {
  localStorage.setItem(STORAGE_KEY, Date.now().toString())
  window.dispatchEvent(new CustomEvent("analyticsRefresh"))
}
