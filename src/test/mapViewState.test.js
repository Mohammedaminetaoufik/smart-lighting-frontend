import { beforeEach, describe, expect, it } from 'vitest'
import {
  MAP_MODE_STORAGE_KEY,
  MAP_VIEW_STORAGE_KEY,
  readMapMode,
  readMapViewState,
  saveMapMode,
  saveMapViewState,
} from '../utils/mapViewState'

describe('map view persistence', () => {
  beforeEach(() => window.localStorage.clear())

  it('restores the saved camera', () => {
    const view = { longitude: -7.62, latitude: 33.58, zoom: 17, bearing: -25, pitch: 55 }
    saveMapViewState(view)

    expect(readMapViewState()).toEqual(view)
  })

  it('ignores an invalid saved camera', () => {
    window.localStorage.setItem(MAP_VIEW_STORAGE_KEY, JSON.stringify({
      longitude: 500,
      latitude: 33.58,
      zoom: 17,
      bearing: 0,
      pitch: 0,
    }))

    expect(readMapViewState()).toBeNull()
  })

  it('restores only a supported map mode', () => {
    saveMapMode('Satellite')
    expect(readMapMode('Plan clair')).toBe('Satellite')

    window.localStorage.setItem(MAP_MODE_STORAGE_KEY, 'mode-inconnu')
    expect(readMapMode('Plan clair')).toBe('Plan clair')
  })
})
