import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import RiskLevelBadge from '../components/predictive-maintenance/RiskLevelBadge'
import TelemetryFreshnessBadge from '../components/predictive-maintenance/TelemetryFreshnessBadge'
import PredictionConfidence from '../components/predictive-maintenance/PredictionConfidence'

describe('predictive badges', () => {
  it('renders a textual risk level and score', () => {
    render(<RiskLevelBadge level="critical" score={92} />)
    expect(screen.getByLabelText('Niveau de risque : Critique, score 92%')).toHaveTextContent('Critique')
  })

  it('renders freshness with an accessible explanation', () => {
    render(<TelemetryFreshnessBadge freshness="obsolete" />)
    const badge = screen.getByLabelText('Fraîcheur des données : Obsolète')
    expect(badge).toHaveTextContent('Obsolète')
    expect(badge).toHaveAttribute('title', 'Fraîcheur : Obsolète (plus de 24 h)')
  })

  it('describes deterministic confidence as score reliability', () => {
    render(<PredictionConfidence value={84} />)
    expect(screen.getByLabelText('Fiabilité du score 84%, Élevée')).toBeInTheDocument()
  })
})
