import { beforeEach, describe, expect, it, vi } from 'vitest'
import client from '../api/client'
import {
  createWorkOrderFromPrediction,
  filterPredictions,
  freshnessFromDate,
  riskLevelFromScore,
  sanitizePrediction,
  sanitizePredictions,
  sortPredictions,
  validatePrediction,
} from '../services/predictiveMaintenanceService'

vi.mock('../api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

const prediction = (overrides = {}) => ({
  id: 1,
  reference: 'LP-001',
  zone: 'rabat centre',
  lcu_reference: 'LCU-RBT-01',
  online: true,
  fault_status: 'underpower',
  predicted_label: 'Sous-consommation',
  risk_score: 72,
  risk_level: 'high',
  confidence: 84,
  eta_hours: 120,
  eta_label: 'Moins de 7 jours',
  telemetry_freshness: 'fresh',
  last_telemetry_at: '2026-07-13T11:55:00Z',
  prediction_generated_at: '2026-07-13T12:00:00Z',
  ...overrides,
})

describe('predictive maintenance business rules', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    [100, 'critical'], [85, 'critical'], [84, 'high'], [70, 'high'],
    [69, 'moderate'], [50, 'moderate'], [49, 'low'], [0, 'low'],
  ])('maps score %s to %s', (score, level) => {
    expect(riskLevelFromScore(score)).toBe(level)
  })

  it('uses unknown when data is insufficient', () => {
    expect(riskLevelFromScore(92, false)).toBe('unknown')
  })

  it('calculates telemetry freshness at every boundary', () => {
    const now = Date.parse('2026-07-13T12:00:00Z')
    expect(freshnessFromDate('2026-07-13T11:46:00Z', now)).toBe('fresh')
    expect(freshnessFromDate('2026-07-13T11:45:00Z', now)).toBe('delayed')
    expect(freshnessFromDate('2026-07-13T10:00:00Z', now)).toBe('stale')
    expect(freshnessFromDate('2026-07-12T12:00:00Z', now)).toBe('obsolete')
    expect(freshnessFromDate(null, now)).toBe('unavailable')
    expect(freshnessFromDate('invalid', now)).toBe('unavailable')
  })

  it('filters the table by search, risk, connectivity and prediction horizon', () => {
    const rows = [
      prediction(),
      prediction({ id: 2, reference: 'LP-002', zone: 'Salé', risk_level: 'moderate', risk_score: 58, online: false, eta_hours: 500 }),
      prediction({ id: 3, reference: 'LP-003', lcu_reference: 'LCU-RBT-02', eta_hours: 2_000 }),
    ]
    expect(filterPredictions(rows, { search: 'lcu-rbt-01', riskLevel: 'high', online: 'online', periodHours: 720 }))
      .toEqual([rows[0]])
  })

  it('sorts risk scores and deadlines without mutating the source', () => {
    const rows = [prediction({ id: 1, risk_score: 58, eta_hours: 500 }), prediction({ id: 2, risk_score: 91, eta_hours: 24 })]
    expect(sortPredictions(rows, 'risk_score', 'desc').map((row) => row.id)).toEqual([2, 1])
    expect(sortPredictions(rows, 'eta_hours', 'asc').map((row) => row.id)).toEqual([2, 1])
    expect(rows.map((row) => row.id)).toEqual([1, 2])
  })

  it('validates, clamps and normalizes received data', () => {
    const raw = prediction({ zone: '  RABAT   CENTRE ', risk_score: 140, confidence: -2, eta_hours: -10, telemetry_freshness: 'obsolete' })
    expect(validatePrediction(raw)).toEqual([])
    expect(sanitizePrediction(raw)).toMatchObject({
      zone: 'Rabat Centre', risk_score: 100, confidence: 0, eta_hours: 0, risk_level: 'critical', online: false,
    })
    expect(validatePrediction({ ...raw, prediction_generated_at: null })).toContain('prediction_generated_at')
  })

  it('rejects invalid rows and duplicate references', () => {
    const rows = sanitizePredictions([
      prediction(),
      prediction({ id: 2, reference: ' lp-001 ' }),
      prediction({ id: 3, reference: 'LP-003', prediction_generated_at: null }),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].reference).toBe('LP-001')
  })

  it('creates a predictive work order with the supported source and lamp identifier', async () => {
    client.post.mockResolvedValue({ id: 42 })
    const item = prediction({ recommendation: 'Inspecter le driver', work_order_id: null })

    const result = await createWorkOrderFromPrediction(item)

    expect(client.post).toHaveBeenCalledWith('/workorders', expect.objectContaining({
      source_type: 'predictive_maintenance',
      lampadaire_id: 1,
      equipment_reference: 'LP-001',
      priority: 'high',
    }))
    expect(result).toMatchObject({ id: 42, existed: false })
  })
})
