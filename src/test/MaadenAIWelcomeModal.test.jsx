import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import MaadenAIWelcomeModal from '../components/ai/MaadenAIWelcomeModal'

describe('MaadenAIWelcomeModal', () => {
  it('introduces MAADEN AI and opens the assistant', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <MemoryRouter initialEntries={['/']}>
        <MaadenAIWelcomeModal open onClose={onClose} />
        <Routes>
          <Route path="/ai-assistant" element={<p>Assistant ouvert</p>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole('dialog', { name: /éclairez chaque décision/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /découvrir l’assistant maaden/i }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.getByText('Assistant ouvert')).toBeInTheDocument()
  })
})
