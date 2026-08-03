import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import GroundedRecommendations from '../components/ai/GroundedRecommendations'

describe('GroundedRecommendations', () => {
  it('relie une recommandation à SQL, RAG et une source web cliquable', () => {
    render(<GroundedRecommendations recommendations={[{
      text: 'Contrôler le driver [W1].',
      origins: ['sql', 'rag', 'web'],
      citations: ['W1'],
      evidence: [{ type: 'web', ref: 'W1', title: 'Guide DALI', url: 'https://dali-alliance.org/guide' }],
      requires_human_validation: true,
      conflict: false,
    }]} />)

    expect(screen.getByText('SQL')).toBeInTheDocument()
    expect(screen.getByText('RAG')).toBeInTheDocument()
    expect(screen.getByText('WEB')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Guide DALI/ })).toHaveAttribute('href', 'https://dali-alliance.org/guide')
    expect(screen.getByText(/Validation humaine/)).toBeInTheDocument()
  })

  it('affiche les contradictions', () => {
    render(<GroundedRecommendations recommendations={[{
      text: 'Appliquer une procédure [W9].', origins: ['sql'], evidence: [],
      requires_human_validation: true, conflict: true,
      conflict_reason: 'Citation W9 absente des résultats web retenus',
    }]} />)
    expect(screen.getByText(/Citation W9 absente/)).toBeInTheDocument()
  })
})
