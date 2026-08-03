import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { getLampadaires } from '../api/lampadaires'
import { getLCUs } from '../api/lcus'
import CommissioningPage from '../pages/Commissioning/CommissioningPage'

vi.mock('../api/lampadaires', () => ({ getLampadaires: vi.fn() }))
vi.mock('../api/lcus', () => ({ getLCUs: vi.fn() }))
vi.mock('../api/admin', () => ({
  batchTestCommissioning: vi.fn(),
  validateSuccessful: vi.fn(),
  retryFailed: vi.fn(),
}))
vi.mock('../components/ai/AIPageInsights', () => ({
  default: ({ defaultExpanded }) => <div data-testid="ai-insights">expanded:{String(defaultExpanded)}</div>,
}))
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const lamps = [
  { id: 1, reference: 'LP-DISC', zone: 'Rabat', lcu_id: 10, commissioning_status: 'discovered' },
  { id: 2, reference: 'LP-LOC-1', zone: 'Rabat', lcu_id: 10, commissioning_status: 'located', commissioning_notes: 'Données contrôleur manquantes' },
  { id: 3, reference: 'LP-LOC-2', zone: 'Salé', lcu_id: 11, commissioning_status: 'located', commissioning_notes: 'Données contrôleur manquantes' },
  { id: 4, reference: 'LP-LIVE', zone: 'Rabat', lcu_id: 10, commissioning_status: 'commissioned' },
]

describe('CommissioningPage', () => {
  beforeEach(() => {
    getLampadaires.mockResolvedValue(lamps)
    getLCUs.mockResolvedValue([
      { id: 10, reference: 'LCU-RABAT', zone: 'Rabat' },
      { id: 11, reference: 'LCU-SALE', zone: 'Salé' },
    ])
  })

  it('shows the current operational blocker before the detailed list', async () => {
    render(<MemoryRouter><CommissioningPage /></MemoryRouter>)

    expect(await screen.findByText('2 lampadaires sont bloqués après la localisation')).toBeInTheDocument()
    expect(screen.getByText(/Vérifiez puis synchronisez les passerelles LCU/)).toBeInTheDocument()
    expect(screen.getByTestId('ai-insights')).toHaveTextContent('expanded:false')
  })

  it('filters the table by the exact stage selected in the progress flow', async () => {
    render(<MemoryRouter><CommissioningPage /></MemoryRouter>)
    await screen.findByText('LP-DISC')

    fireEvent.click(screen.getByRole('button', { name: /Localisé.*2 à cette étape/i }))

    await waitFor(() => {
      expect(screen.queryByText('LP-DISC')).not.toBeInTheDocument()
      expect(screen.getByText('LP-LOC-1')).toBeInTheDocument()
      expect(screen.getByText('LP-LOC-2')).toBeInTheDocument()
      expect(screen.queryByText('LP-LIVE')).not.toBeInTheDocument()
    })
  })

  it('separates commissioned lamps from the pending view', async () => {
    render(<MemoryRouter><CommissioningPage /></MemoryRouter>)
    await screen.findByText('LP-DISC')

    expect(screen.queryByText('LP-LIVE')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /En service 1/i }))

    expect(await screen.findByText('LP-LIVE')).toBeInTheDocument()
    expect(screen.queryByText('LP-DISC')).not.toBeInTheDocument()
  })
})
