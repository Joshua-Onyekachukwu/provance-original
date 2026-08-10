// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../components/ui'
import { NOISE_STORAGE_KEY } from '../../lib/mockNoise.js'
import { mockFeatureFlags } from '../../lib/mockData.js'
import FeatureFlagsPage from './FeatureFlagsPage.jsx'

// Control the API outcome while keeping the real (deterministic) mock data:
// getFeatureFlags stays real; updateFeatureFlag is stubbed per test so the
// optimistic toggle success and revert-on-error paths are both deterministic.
vi.mock('../../lib/api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, updateFeatureFlag: vi.fn() }
})

import { updateFeatureFlag } from '../../lib/api.js'

const mockedUpdate = vi.mocked(updateFeatureFlag)

const initialEnabled = mockFeatureFlags.filter((f) => f.enabled).length
const DEEP_SCAN = mockFeatureFlags.find((f) => f.key === 'deep_scan_mode')
const TARGET_LABEL = DEEP_SCAN.label

describe('FeatureFlagsPage optimistic toggle', () => {
  beforeEach(() => {
    mockedUpdate.mockReset()
    localStorage.setItem(NOISE_STORAGE_KEY, '0')
  })

  afterEach(() => {
    localStorage.removeItem(NOISE_STORAGE_KEY)
  })

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/app/admin/feature-flags']}>
        <ToastProvider>
          <FeatureFlagsPage />
        </ToastProvider>
      </MemoryRouter>,
    )
  }

  it('flips the switch optimistically, calls the API, and keeps every row rendered', async () => {
    const user = userEvent.setup()
    mockedUpdate.mockResolvedValue({ key: 'deep_scan_mode', enabled: false })
    renderPage()

    // Wait for the table, then toggle Deep Scan Mode (enabled → disabled).
    const switchEl = await screen.findByRole('switch', { name: `Toggle ${TARGET_LABEL}` })
    expect(switchEl).toHaveAttribute('aria-checked', 'true')

    await user.click(switchEl)
    await user.click(screen.getByRole('button', { name: 'Disable' }))

    // The API was called with the new value…
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledWith('deep_scan_mode', false))

    // …and the optimistic flip stuck: the switch reads disabled and the KPI
    // Enabled count dropped by exactly one (working-copy lockstep).
    expect(await screen.findByRole('switch', { name: `Toggle ${TARGET_LABEL}` })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(screen.getByText(new RegExp(`${initialEnabled - 1} enabled`))).toBeInTheDocument()

    // Stale-closure guard: the table still renders the full flag set — a
    // regression here would blank the table after the toggle resolves.
    for (const flag of mockFeatureFlags) {
      expect(screen.getByText(flag.label)).toBeInTheDocument()
    }
  })

  it('reverts the optimistic flip when the API fails and keeps the KPI count', async () => {
    const user = userEvent.setup()
    mockedUpdate.mockRejectedValue(new Error('flag service down'))
    renderPage()

    const switchEl = await screen.findByRole('switch', { name: `Toggle ${TARGET_LABEL}` })
    await user.click(switchEl)
    await user.click(screen.getByRole('button', { name: 'Disable' }))

    // Reverted: switch back on, KPI count unchanged, error toast surfaced.
    await waitFor(() =>
      expect(
        screen.getByRole('switch', { name: `Toggle ${TARGET_LABEL}` }),
      ).toHaveAttribute('aria-checked', 'true'),
    )
    expect(screen.getByText(new RegExp(`${initialEnabled} enabled`))).toBeInTheDocument()
    expect(
      await screen.findByText(`Could not disable "${TARGET_LABEL}"`),
    ).toBeInTheDocument()

    for (const flag of mockFeatureFlags) {
      expect(screen.getByText(flag.label)).toBeInTheDocument()
    }
  })

  it('leaves other switches untouched after a single toggle', async () => {
    const user = userEvent.setup()
    mockedUpdate.mockResolvedValue({ key: 'deep_scan_mode', enabled: false })
    renderPage()

    const switchEl = await screen.findByRole('switch', { name: `Toggle ${TARGET_LABEL}` })
    await user.click(switchEl)
    await user.click(screen.getByRole('button', { name: 'Disable' }))

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalled())

    // Every other switch keeps its original state (immutable per-key toggle).
    for (const flag of mockFeatureFlags) {
      if (flag.key === 'deep_scan_mode') continue
      expect(screen.getByRole('switch', { name: `Toggle ${flag.label}` })).toHaveAttribute(
        'aria-checked',
        String(flag.enabled),
      )
    }
  })
})
