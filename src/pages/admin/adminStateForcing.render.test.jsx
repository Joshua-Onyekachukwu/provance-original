// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../components/ui'
import { NOISE_STORAGE_KEY } from '../../lib/mockNoise.js'
import OrganizationsPage from './OrganizationsPage.jsx'
import FeatureFlagsPage from './FeatureFlagsPage.jsx'

// MemoryRouter keeps its location in memory, so the mock's ?noisy=0 URL flag
// (which reads window.location.search) is invisible here — silence the random
// error injection via the localStorage kill switch instead, so every fetch in
// these tests is deterministic.
const DEMO_ERROR = 'Demo state — forced error for review. This is not a real outage.'

function renderAt(path, ui) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>,
  )
}

describe('admin ?state= demo forcing (withDemoOverride)', () => {
  beforeEach(() => {
    localStorage.setItem(NOISE_STORAGE_KEY, '0')
  })

  afterEach(() => {
    localStorage.removeItem(NOISE_STORAGE_KEY)
  })

  it('Organizations forces the empty surface', async () => {
    renderAt('/app/admin/organizations?state=empty', <OrganizationsPage />)

    // withDemoOverride('empty') → ready with [] → the DataTable empty branch.
    expect(await screen.findByText('No organizations found')).toBeInTheDocument()
  })

  it('Organizations forces the error surface with retry', async () => {
    renderAt('/app/admin/organizations?state=error', <OrganizationsPage />)

    expect(await screen.findByText('Could not load data')).toBeInTheDocument()
    expect(screen.getByText(DEMO_ERROR)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('FeatureFlags forces the empty surface', async () => {
    renderAt('/app/admin/feature-flags?state=empty', <FeatureFlagsPage />)

    expect(
      await screen.findByText('No feature flags configured yet'),
    ).toBeInTheDocument()
  })

  it('FeatureFlags forces the error surface with retry', async () => {
    renderAt('/app/admin/feature-flags?state=error', <FeatureFlagsPage />)

    expect(await screen.findByText('Could not load data')).toBeInTheDocument()
    expect(screen.getByText(DEMO_ERROR)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('FeatureFlags renders the live table without a forced state', async () => {
    renderAt('/app/admin/feature-flags', <FeatureFlagsPage />)

    // No ?state= → real (deterministic, noise-off) mock data renders.
    expect(await screen.findByText('Deep Scan Mode')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Toggle Deep Scan Mode' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})
