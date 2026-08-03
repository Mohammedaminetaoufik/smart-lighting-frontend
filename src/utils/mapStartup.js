export const MAP_STARTUP_STORAGE_KEY = 'maaden-map-startup-shown-for-login'

export function resetMapStartup() {
  sessionStorage.removeItem(MAP_STARTUP_STORAGE_KEY)
}
