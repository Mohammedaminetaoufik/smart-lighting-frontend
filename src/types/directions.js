/**
 * Shared JSDoc types for the Mapbox driving-directions feature.
 *
 * This project is JavaScript (Vite + React, no tsconfig), so the requested
 * TypeScript interfaces are expressed as JSDoc typedefs — editors and the
 * TS language service read them the same way a `.ts` file would.
 *
 * @module types/directions
 */

/** The Mapbox travel profile for this feature — always car driving. */
export const DRIVING_PROFILE = 'mapbox/driving'

/**
 * A geographic point. Mapbox always expects the [longitude, latitude] order.
 * @typedef {Object} Coordinates
 * @property {number} longitude
 * @property {number} latitude
 */

/**
 * The equipment targeted by a route (an LCU or a lighting point).
 * @typedef {Object} RouteDestination
 * @property {number|string} id
 * @property {'lamp'|'lcu'} type
 * @property {string} label
 * @property {number} longitude
 * @property {number} latitude
 */

/**
 * One turn-by-turn driving instruction.
 * @typedef {Object} DrivingRouteStep
 * @property {string} instruction
 * @property {number} distanceMeters
 * @property {number} durationSeconds
 * @property {string} [name]
 */

/**
 * The normalized result of a driving route request.
 * @typedef {Object} DrivingRouteResult
 * @property {GeoJSON.LineString} geometry
 * @property {number} distanceMeters
 * @property {number} durationSeconds
 * @property {DrivingRouteStep[]} steps
 */

export default {}
