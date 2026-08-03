import { describe, expect, it } from 'vitest'
import { isAIHealthAvailable } from '../api/ai'

describe('AI readiness status', () => {
  it.each(['ok', 'ready', 'degraded'])('accepts %s as available', (status) => {
    expect(isAIHealthAvailable({ status })).toBe(true)
  })

  it.each(['not_ready', 'error', undefined])('rejects %s as unavailable', (status) => {
    expect(isAIHealthAvailable(status ? { status } : undefined)).toBe(false)
  })
})
