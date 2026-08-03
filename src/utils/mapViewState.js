export const MAP_VIEW_STORAGE_KEY = 'maaden-map-last-view-v1'
export const MAP_MODE_STORAGE_KEY = 'maaden-map-mode-v1'

const MAP_MODES = new Set(['Plan clair', 'Satellite', '3D jour', '3D nuit'])

const isFiniteBetween = (value, min, max) =>
  Number.isFinite(value) && value >= min && value <= max

export function readMapViewState() {
  if (typeof window === 'undefined') return null

  try {
    const value = JSON.parse(window.localStorage.getItem(MAP_VIEW_STORAGE_KEY))
    if (!value || typeof value !== 'object') return null

    const view = {
      longitude: Number(value.longitude),
      latitude: Number(value.latitude),
      zoom: Number(value.zoom),
      bearing: Number(value.bearing),
      pitch: Number(value.pitch),
    }

    if (!isFiniteBetween(view.longitude, -180, 180)) return null
    if (!isFiniteBetween(view.latitude, -90, 90)) return null
    if (!isFiniteBetween(view.zoom, 3, 21)) return null
    if (!isFiniteBetween(view.bearing, -360, 360)) return null
    if (!isFiniteBetween(view.pitch, 0, 85)) return null

    return view
  } catch {
    return null
  }
}

export function saveMapViewState(view) {
  if (typeof window === 'undefined' || !view) return

  const nextView = {
    longitude: Number(view.longitude),
    latitude: Number(view.latitude),
    zoom: Number(view.zoom),
    bearing: Number(view.bearing),
    pitch: Number(view.pitch),
  }

  window.localStorage.setItem(MAP_VIEW_STORAGE_KEY, JSON.stringify(nextView))
}

export function readMapMode(fallback) {
  if (typeof window === 'undefined') return fallback
  const savedMode = window.localStorage.getItem(MAP_MODE_STORAGE_KEY)
  return MAP_MODES.has(savedMode) ? savedMode : fallback
}

export function saveMapMode(mode) {
  if (typeof window === 'undefined' || !MAP_MODES.has(mode)) return
  window.localStorage.setItem(MAP_MODE_STORAGE_KEY, mode)
}
