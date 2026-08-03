import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PriorityLampTable from '../components/predictive-maintenance/PriorityLampTable'
import PredictionDetailsDrawer from '../components/predictive-maintenance/PredictionDetailsDrawer'
import * as service from '../services/predictiveMaintenanceService'

vi.mock('../services/predictiveMaintenanceService', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getLampPrediction: vi.fn() }
})

const prediction = {
  id: 42,
  reference: 'LP-042',
  zone: 'Rabat Centre',
  lcu_reference: 'LCU-RBT-03',
  online: true,
  risk_level: 'critical',
  risk_score: 92,
  fault_status: 'underpower',
  predicted_label: 'Sous-consommation',
  eta_hours: 120,
  eta_label: 'Moins de 7 jours',
  confidence: 87,
  telemetry_freshness: 'fresh',
  last_telemetry_at: '2026-07-13T11:55:00Z',
  prediction_generated_at: '2026-07-13T12:00:00Z',
  model_version: 'Règles v1',
  signals: [{
    key: 'power', label: 'Puissance consommée', current_value: 56, expected_value: 80,
    unit: 'W', deviation_percent: -30, contribution_percent: 45, severity: 'critical',
  }],
  recommendation: 'Vérifier le driver LED.',
}

function Harness() {
  const [lampId, setLampId] = useState(null)
  return (
    <>
      <PriorityLampTable
        items={[prediction]}
        selected={new Set()}
        onToggleSelect={() => {}}
        onToggleAll={() => {}}
        onAction={() => {}}
        onRowClick={(row) => setLampId(row.id)}
      />
      <PredictionDetailsDrawer lampId={lampId} onClose={() => setLampId(null)} onAction={() => {}} />
    </>
  )
}

describe('prediction diagnostic drawer', () => {
  it('opens from a table row and closes with its button', async () => {
    service.getLampPrediction.mockResolvedValue(prediction)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const user = userEvent.setup()
    render(<QueryClientProvider client={queryClient}><Harness /></QueryClientProvider>)

    await user.click(screen.getByLabelText('Ouvrir le diagnostic de LP-042'))
    const dialog = await screen.findByRole('dialog', { name: 'Diagnostic prédictif' })
    expect(within(dialog).getByText('LP-042')).toBeInTheDocument()
    expect(within(dialog).getByText('Puissance consommée')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Fermer le diagnostic' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
