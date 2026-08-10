// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Button from './Button'

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Button', () => {
  it('renders a native <button> by default', () => {
    render(<Button>Run scan</Button>)

    const button = screen.getByRole('button', { name: 'Run scan' })
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('renders as a router <a href> when `to` is set (Link semantics)', () => {
    renderWithRouter(<Button to="/app/reports">Export PDF</Button>)

    const link = screen.getByRole('link', { name: 'Export PDF' })
    expect(link).toBeInTheDocument()
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/app/reports')
  })

  it('fires onClick when clicked (button form)', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Start</Button>)

    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('still fires onClick on the Link form', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    renderWithRouter(<Button to="/app/history" onClick={onClick}>History</Button>)

    await user.click(screen.getByRole('link', { name: 'History' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows a spinner and disables while loading', () => {
    render(<Button loading>Verifying</Button>)

    const button = screen.getByRole('button', { name: 'Verifying' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('span[aria-hidden="true"]')).toBeTruthy()
  })

  it('blocks clicks while disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Locked</Button>)

    await user.click(screen.getByRole('button', { name: 'Locked' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('applies the variant class for the chosen tone', () => {
    render(<Button variant="danger">Delete</Button>)

    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button.className).toContain('bg-rose-600')
    expect(button.className).toContain('hover:bg-rose-700')
  })

  it('honors a size prop with the matching height class', () => {
    render(<Button size="sm">Small</Button>)

    const button = screen.getByRole('button', { name: 'Small' })
    expect(button.className).toContain('h-8')
  })
})
