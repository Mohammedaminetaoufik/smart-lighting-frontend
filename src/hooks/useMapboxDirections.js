import { useCallback, useRef, useState } from 'react'
import { fetchDrivingRoute, DirectionsError } from '../services/mapboxDirections.service'

/**
 * State + actions for the driving-directions feature. Keeps all routing logic
 * out of the map component. The computed route (incl. its GeoJSON geometry) is
 * held in React state, so it is re-rendered — and therefore restored by
 * react-map-gl — after every Mapbox style switch.
 * @module hooks/useMapboxDirections
 */

/** User-facing messages (French, to match the app UI). */
export const DIRECTIONS_MESSAGES = {
  GEO_DENIED:           'Autorisez l’accès à la localisation pour calculer l’itinéraire routier.',
  POSITION_UNAVAILABLE: 'Votre position n’est pas disponible pour le moment.',
  NO_DEST_COORDS:       'La localisation de cet équipement n’est pas disponible.',
  TOKEN_MISSING:        'Jeton Mapbox manquant (VITE_MAPBOX_ACCESS_TOKEN).',
  NO_ROUTE:             'Aucun itinéraire routier n’a été trouvé.',
  NETWORK:              'Erreur de connexion réseau. Vérifiez votre connexion.',
  BAD_RESPONSE:         'L’itinéraire ne peut pas être calculé pour le moment.',
  INVALID_RESPONSE:     'Réponse Mapbox invalide.',
  GENERIC:              'L’itinéraire ne peut pas être calculé pour le moment.',
}

/** @returns {Promise<import('../types/directions').Coordinates>} */
function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new DirectionsError('POSITION_UNAVAILABLE'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ longitude: pos.coords.longitude, latitude: pos.coords.latitude }),
      (err) => reject(new DirectionsError(
        err && err.code === err.PERMISSION_DENIED ? 'GEO_DENIED' : 'POSITION_UNAVAILABLE',
      )),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })
}

export function useMapboxDirections() {
  // route: DrivingRouteResult augmented with { start, destination }
  const [route, setRoute] = useState(null)
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'ready' | 'error'
  const [error, setError] = useState(null)      // localized message | null
  const abortRef = useRef(null)

  const clearRoute = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setRoute(null)
    setError(null)
    setStatus('idle')
  }, [])

  /**
   * Compute a car driving route from the user's current position to the given
   * equipment. Only ever called on an explicit user action.
   * @param {{ destination: import('../types/directions').RouteDestination }} args
   */
  const calculateDrivingRoute = useCallback(async ({ destination }) => {
    setError(null)

    const dLng = Number(destination?.longitude)
    const dLat = Number(destination?.latitude)
    if (destination?.longitude == null || destination?.latitude == null ||
        !Number.isFinite(dLng) || !Number.isFinite(dLat)) {
      setRoute(null)
      setStatus('error')
      setError(DIRECTIONS_MESSAGES.NO_DEST_COORDS)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('loading')

    try {
      const start = await getBrowserPosition()
      const result = await fetchDrivingRoute(
        start,
        { longitude: dLng, latitude: dLat },
        { signal: controller.signal },
      )
      setRoute({ ...result, start, destination })
      setStatus('ready')
    } catch (err) {
      if (err?.name === 'AbortError') return
      const code = err instanceof DirectionsError ? err.code : 'GENERIC'
      setStatus('error')
      setError(DIRECTIONS_MESSAGES[code] || DIRECTIONS_MESSAGES.GENERIC)
    }
  }, [])

  return { route, status, error, calculateDrivingRoute, clearRoute }
}
