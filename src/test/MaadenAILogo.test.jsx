import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import MaadenAILogo from '../components/brand/MaadenAILogo'

describe('MaadenAILogo', () => {
  it('exposes the brand and enables the thinking animation state', () => {
    render(<MaadenAILogo size={48} thinking wordmark />)

    const logo = screen.getByRole('img', { name: 'MAADEN AI' })
    expect(logo).toHaveClass('maaden-ai-mark--thinking')
    expect(logo).toHaveStyle({ '--maaden-ai-size': '48px' })
    expect(screen.getByText('MAADEN')).toBeInTheDocument()
    expect(screen.getByText('AI')).toBeInTheDocument()
  })
})
