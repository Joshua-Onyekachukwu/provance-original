// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Card from './Card'

describe('Card', () => {
  it('renders the header block (eyebrow, title, description) and children by default', () => {
    render(
      <Card eyebrow="Upload status" title="Moving through the pipeline" description="Steps follow the production path.">
        <p>Child content</p>
      </Card>,
    )

    expect(screen.getByText('Upload status')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Moving through the pipeline' })).toBeInTheDocument()
    expect(screen.getByText('Steps follow the production path.')).toBeInTheDocument()
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('renders loading skeletons in the loading state', () => {
    render(<Card state="loading" loadingRows={3} title="Ledger" />)

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
    // loadingRows drives the number of skeleton rows.
    const status = screen.getByRole('status', { name: 'Loading' })
    expect(status.querySelectorAll('div[class*="animate-pulse"]')).toHaveLength(3)
  })

  it('renders the empty state with a custom title and description', () => {
    render(
      <Card
        state="empty"
        emptyTitle="No reports yet"
        emptyDescription="Start a verification to generate one."
      />,
    )

    expect(screen.getByText('No reports yet')).toBeInTheDocument()
    expect(screen.getByText('Start a verification to generate one.')).toBeInTheDocument()
  })

  it('renders the error state with a retry button that calls onRetry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <Card
        state="error"
        errorTitle="Could not load"
        errorDescription="The feed is unavailable."
        onRetry={onRetry}
      />,
    )

    expect(screen.getByText('Could not load')).toBeInTheDocument()
    expect(screen.getByText('The feed is unavailable.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders the error state without a retry button when onRetry is absent', () => {
    render(<Card state="error" errorTitle="Could not load" />)

    expect(screen.getByText('Could not load')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
  })

  it('does not render children in the loading/empty/error states', () => {
    const { rerender } = render(
      <Card state="loading">
        <p>Secret</p>
      </Card>,
    )
    expect(screen.queryByText('Secret')).toBeNull()

    rerender(
      <Card state="empty">
        <p>Secret</p>
      </Card>,
    )
    expect(screen.queryByText('Secret')).toBeNull()

    rerender(
      <Card state="error">
        <p>Secret</p>
      </Card>,
    )
    expect(screen.queryByText('Secret')).toBeNull()
  })

  it('renders actions in the header block', () => {
    render(<Card title="Ledger" actions={<button type="button">Export</button>} />)

    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
  })
})
