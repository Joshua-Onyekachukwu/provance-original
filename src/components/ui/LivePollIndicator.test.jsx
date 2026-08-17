// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LivePollIndicator from './LivePollIndicator'

describe('LivePollIndicator', () => {
  it('renders the pulsing dot + auto-refreshing label as a status region', () => {
    render(<LivePollIndicator />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByLabelText('Auto-refreshing — tracking worker progress')).toBeInTheDocument()
    expect(screen.getByText('auto-refreshing')).toBeInTheDocument()
    // Without onRefresh it is a pure status atom — no interactive control.
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders a tap-to-refresh button when onRefresh is provided', async () => {
    const onRefresh = vi.fn()
    const user = userEvent.setup()
    render(<LivePollIndicator onRefresh={onRefresh} />)

    const button = screen.getByRole('button', { name: 'Refresh now' })
    expect(button).toBeInTheDocument()

    await user.click(button)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('keeps the refresh button OUTSIDE the live status region', () => {
    render(<LivePollIndicator onRefresh={() => {}} />)

    // The button is a normal interactive control — a live region containing
    // it would announce every interaction; the dot+label stay the region.
    const status = screen.getByRole('status')
    const button = screen.getByRole('button', { name: 'Refresh now' })
    expect(status).not.toContainElement(button)
  })
})
