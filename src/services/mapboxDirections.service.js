import { DRIVING_PROFILE } from '../types/directions'

/**
 * Mapbox Directions API client — car driving only.
 * The request is made directly from the frontend with the existing public
 * Mapbox token; no backend change is required.
 * @module services/mapboxDirections.service
 */

const DIRECTIONS_ENDPOINT = 'https://api.mapbox.com/directions/v5'

/**
 * Error tagged with a machine-readable code so the UI can map it to a
 * localized, user-facing message.
 */
export class DirectionsError extends Error {
  constructor(code, message) {
    super(message || code)
    this.name = 'DirectionsError'
    this.code = code
  }
}

/** @param {{longitude:number, latitude:number}} c */
function isValidCoord(c) {
  return !!c && Number.isFinite(Number(c.longitude)) && Number.isFinite(Number(c.latitude))
}

/**
 * Fetch a car driving route between two points from the Mapbox Directions API.
 * Coordinates are serialized as [longitude, latitude] — never [latitude, longitude].
 *
 * @param {import('../types/directions').Coordinates} start
 * @param {import('../types/directions').Coordinates} destination
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<import('../types/directions').DrivingRouteResult>}
 */
export async function fetchDrivingRoute(start, destination, { signal } = {}) {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
  if (!token) throw new DirectionsError('TOKEN_MISSING')
  if (!isValidCoord(start)) throw new DirectionsError('POSITION_UNAVAILABLE')
  if (!isValidCoord(destination)) throw new DirectionsError('NO_DEST_COORDS')

  // Order is mandatory: {longitude},{latitude};{longitude},{latitude}
  const coords = `${start.longitude},${start.latitude};${destination.longitude},${destination.latitude}`
  const url =
    `${DIRECTIONS_ENDPOINT}/${DRIVING_PROFILE}/${coords}` +
    `?geometries=geojson&steps=true&overview=full&access_token=${token}`

  let response
  try {
    response = await fetch(url, { signal })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new DirectionsError('NETWORK')
  }

  if (response.status === 401 || response.status === 403) throw new DirectionsError('TOKEN_MISSING')
  if (!response.ok) throw new DirectionsError('BAD_RESPONSE')

  let data
  try {
    data = await response.json()
  } catch {
    throw new DirectionsError('INVALID_RESPONSE')
  }

  if (!data || typeof data !== 'object') throw new DirectionsError('INVALID_RESPONSE')
  if (data.code && data.code !== 'Ok') {
    throw new DirectionsError(data.code === 'NoRoute' ? 'NO_ROUTE' : 'BAD_RESPONSE')
  }

  const route = Array.isArray(data.routes) ? data.routes[0] : null
  if (!route?.geometry?.coordinates?.length) throw new DirectionsError('NO_ROUTE')

  const steps = (route.legs?.[0]?.steps || []).map((s) => ({
    instruction: s.maneuver?.instruction || '',
    distanceMeters: Number(s.distance) || 0,
    durationSeconds: Number(s.duration) || 0,
    name: s.name || '',
  }))

  return {
    geometry: route.geometry,
    distanceMeters: Number(route.distance) || 0,
    durationSeconds: Number(route.duration) || 0,
    steps,
  }
}
