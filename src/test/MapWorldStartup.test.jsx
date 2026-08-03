import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MapWorldStartup from '../components/map/MapWorldStartup'

describe('MapWorldStartup', () => {
  afterEach(() => vi.useRealTimers())

  it('révèle la carte après cinq secondes', () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<MapWorldStartup duration={5000} onComplete={onComplete} />)
    const splash = screen.getByRole('status', { name: /initialisation de la carte mondiale/i })

    act(() => vi.advanceTimersByTime(4450))
    expect(splash).toHaveClass('map-world-startup--leaving')
    expect(onComplete).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(550))
    expect(onComplete).toHaveBeenCalledOnce()
  })
})
