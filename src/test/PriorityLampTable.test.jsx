import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PriorityLampTable from '../components/predictive-maintenance/PriorityLampTable'

const item = (overrides = {}) => ({
  id: 1,
  reference: 'LP-001',
  zone: 'Rabat Centre',
  lcu_reference: 'LCU-RBT-01',
  online: true,
  risk_level: 'high',
  risk_score: 76,
  predicted_label: 'Sous-consommation',
  eta_hours: 120,
  eta_label: 'Moins de 7 jours',
  confidence: 84,
  telemetry_freshness: 'fresh',
  last_telemetry_at: '2026-07-13T11:55:00Z',
  ...overrides,
})

const defaultProps = {
  selected: new Set(),
  onToggleSelect: vi.fn(),
  onToggleAll: vi.fn(),
  onRowClick: vi.fn(),
  onAction: vi.fn(),
}

describe('priority lamp table', () => {
  it('shows its empty state', () => {
    render(<PriorityLampTable {...defaultProps} items={[]} />)
    expect(screen.getByText('Aucun lampadaire à risque')).toBeInTheDocument()
  })

  it('shows its error state', () => {
    render(<PriorityLampTable {...defaultProps} items={[]} error />)
    expect(screen.getByRole('alert')).toHaveTextContent('Erreur de chargement du tableau.')
  })

  it('sorts rows by risk score in both directions', async () => {
    const user = userEvent.setup()
    render(<PriorityLampTable {...defaultProps} items={[item(), item({ id: 2, reference: 'LP-002', risk_score: 92 })]} />)
    const rows = () => screen.getAllByRole('row').slice(1)
    expect(rows()[0]).toHaveTextContent('LP-002')
    await user.click(screen.getByRole('button', { name: 'Trier par Score' }))
    expect(rows()[0]).toHaveTextContent('LP-001')
  })
})
