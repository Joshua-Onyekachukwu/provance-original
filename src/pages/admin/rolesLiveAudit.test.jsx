// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../components/ui'
import { NOISE_STORAGE_KEY } from '../../lib/mockNoise.js'

// Deterministic actor for the signed-in admin (the mock session's super_admin).
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'usr_001', email: 'founder.admin@provance.local' },
    profile: { displayName: 'Founder Admin' },
  }),
}))

import RolesPage from './RolesPage.jsx'

function renderRoles() {
  return render(
    <MemoryRouter initialEntries={['/app/admin/roles']}>
      <ToastProvider>
        <RolesPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('RolesPage live audit trail', () => {
  beforeEach(() => {
    // Silence the mock's random error injection so fetches are deterministic.
    localStorage.setItem(NOISE_STORAGE_KEY, '0')
  })

  afterEach(() => {
    localStorage.removeItem(NOISE_STORAGE_KEY)
    vi.clearAllMocks()
  })

  it('prepends a live scope event with the signed-in actor when a scope is toggled', async () => {
    renderRoles()

    // Wait for the roster to land, then toggle a scope that starts disabled
    // (Admin: roles.manage = false) so the assertion is deterministic.
    const toggle = await screen.findByLabelText('Manage roles for Admin')
    expect(toggle).not.toBeChecked()
    fireEvent.click(toggle)
    expect(toggle).toBeChecked()

    // The live event appears in the trail, newest first, with the admin actor.
    expect(
      await screen.findByText('Admin role — enabled roles.manage for the whole role.'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('founder.admin@provance.local').length).toBeGreaterThan(0)

    // Header meta counts the live event alongside the static rows (6 + 1).
    expect(screen.getByText('7 events')).toBeInTheDocument()
  })

  it('prepends a live member reassignment event when a member changes role', async () => {
    renderRoles()

    // Amina starts in Admin (usr_002 → role_admin); her selector excludes Owner.
    const select = await screen.findByLabelText('Role for Amina Sow')
    fireEvent.change(select, { target: { value: 'role_analyst' } })

    expect(
      await screen.findByText('Amina Sow moved from Admin to Analyst.'),
    ).toBeInTheDocument()
    expect(screen.getByText('7 events')).toBeInTheDocument()
  })

  it('keeps the trail newest-first across multiple live events', async () => {
    renderRoles()

    const firstToggle = await screen.findByLabelText('Manage roles for Admin')
    fireEvent.click(firstToggle)
    const secondToggle = screen.getByLabelText('Manage billing for Admin')
    fireEvent.click(secondToggle)

    // Descriptions appear in DOM (document) order: the later toggle is prepended,
    // so it renders above the first one.
    const descriptions = await screen.findAllByText(/enabled (roles|billing)\.manage for the whole role\./)
    expect(descriptions).toHaveLength(2)
    expect(descriptions[0]).toHaveTextContent(
      'Admin role — enabled billing.manage for the whole role.',
    )
    expect(descriptions[1]).toHaveTextContent(
      'Admin role — enabled roles.manage for the whole role.',
    )
  })
})
