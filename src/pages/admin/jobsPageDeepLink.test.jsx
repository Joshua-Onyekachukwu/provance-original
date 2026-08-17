// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../components/ui'
import { NOISE_STORAGE_KEY } from '../../lib/mockNoise.js'
import JobsPage from './JobsPage.jsx'

/**
 * Deep-link server-side resolution: /app/admin/jobs?status=failed must
 * render the failed subset through the API call (mock applies the filter +
 * pagination, mirroring the backend) while the worker panel + status counts
 * still derive from the full set.
 *
 * MemoryRouter keeps its location in memory, so the mock's ?noisy=0 URL flag
 * (which reads window.location.search) is invisible here — silence the random
 * error injection via the localStorage kill switch instead, so every fetch in
 * these tests is deterministic.
 */
function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <JobsPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('Admin Jobs deep link (?status=failed)', () => {
  beforeEach(() => {
    localStorage.setItem(NOISE_STORAGE_KEY, '0')
  })

  afterEach(() => {
    localStorage.removeItem(NOISE_STORAGE_KEY)
  })

  it('resolves the status filter server-side and keeps the panel on the full set', async () => {
    renderAt('/app/admin/jobs?status=failed')

    // The Failed status tab is the active (pressed) one — the URL param drove
    // it. (Name regex is scoped to the status tab, not the 'All workers' filter
    // button, which also starts with 'All'.)
    const failedTab = await screen.findByRole('button', { name: /^Failed/ }, { timeout: 2500 })
    expect(failedTab).toHaveAttribute('aria-pressed', 'true')

    // The All status tab is NOT pressed — status came from the deep link,
    // not a click. (Negative lookahead excludes the 'All workers' filter.)
    expect(screen.getByRole('button', { name: /^All(?! workers)/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    // Every table row belongs to the failed subset (the API filtered it).
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1) // skip header row
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.textContent).toContain('Failed')
    }

    // The worker panel still renders from the full set, not the failed page.
    expect(screen.getByText('Worker utilization')).toBeInTheDocument()
  })

  it('falls back to the full ledger when no ?status= param is present', async () => {
    renderAt('/app/admin/jobs')

    const allTab = await screen.findByRole(
      'button',
      { name: /^All(?! workers)/ },
      { timeout: 2500 },
    )
    expect(allTab).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Worker utilization')).toBeInTheDocument()
  })
})
