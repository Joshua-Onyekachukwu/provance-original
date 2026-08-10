// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../components/ui'
import { NOISE_STORAGE_KEY } from '../../lib/mockNoise.js'

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'usr_001', email: 'founder.admin@provance.local' },
    profile: { displayName: 'Founder Admin' },
  }),
}))

// Keep getAdminRoles real (deterministic mock data) but stub the two mutations
// so each test controls persist/success/failure.
vi.mock('../../lib/api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    updateRoleScopes: vi.fn(),
    reassignMemberRole: vi.fn(),
  }
})

import { reassignMemberRole, updateRoleScopes } from '../../lib/api.js'
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

describe('RolesPage save actions (API wiring)', () => {
  beforeEach(() => {
    localStorage.setItem(NOISE_STORAGE_KEY, '0')
    updateRoleScopes.mockReset()
    reassignMemberRole.mockReset()
    updateRoleScopes.mockResolvedValue({ ok: true })
    reassignMemberRole.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    localStorage.removeItem(NOISE_STORAGE_KEY)
    vi.clearAllMocks()
  })

  it('Save role persists the role with its current scopes and toasts success', async () => {
    renderRoles()

    const toggle = await screen.findByLabelText('Manage roles for Admin')
    fireEvent.click(toggle) // Admin: roles.manage false → true

    // Three editable roles each render a "Save role" button — target the
    // Admin card's own (Owner's is disabled above it in ROLE_ORDER).
    const adminCard = screen.getByRole('heading', { name: 'Admin' }).closest('section')
    fireEvent.click(within(adminCard).getByRole('button', { name: 'Save role' }))

    await waitFor(() =>
      expect(updateRoleScopes).toHaveBeenCalledTimes(1),
    )
    const [roleId, scopes] = updateRoleScopes.mock.calls[0]
    expect(roleId).toBe('role_admin')
    expect(scopes['roles.manage']).toBe(true)

    expect(await screen.findByText('Role saved')).toBeInTheDocument()
    // The persisted change lands in the live audit trail.
    expect(
      await screen.findByText(/permission changes saved \(/),
    ).toBeInTheDocument()
  })

  it('Save all changes persists every editable role', async () => {
    renderRoles()

    // The header renders before the roster lands — wait for data so
    // localRoles is populated before the loop iterates it.
    await screen.findByLabelText('Manage roles for Admin')
    fireEvent.click(
      await screen.findByRole('button', { name: 'Save all changes' }),
    )

    await waitFor(() => expect(updateRoleScopes).toHaveBeenCalledTimes(3))
    const savedRoleIds = updateRoleScopes.mock.calls.map(([id]) => id)
    expect(savedRoleIds).toEqual(['role_admin', 'role_analyst', 'role_viewer'])

    expect(await screen.findByText('Roles saved')).toBeInTheDocument()
  })

  it('a failed reassignment reverts the optimistic move and toasts the error', async () => {
    reassignMemberRole.mockRejectedValue(new Error('Simulated failure.'))
    renderRoles()

    const select = await screen.findByLabelText('Role for Amina Sow')
    fireEvent.change(select, { target: { value: 'role_analyst' } })

    expect(await screen.findByText('Reassignment failed')).toBeInTheDocument()
    expect(screen.getByText('Simulated failure.')).toBeInTheDocument()

    // The member's selector snaps back to the previous role and the Admin
    // count is restored (chip shows 3 again).
    const revertedSelect = screen.getByLabelText('Role for Amina Sow')
    await waitFor(() => expect(revertedSelect.value).toBe('role_admin'))
    // Chip textContent is "Admin3" (the count span carries a margin, no space).
    expect(screen.getByRole('button', { name: /Admin\s*3/ })).toBeInTheDocument()

    // No audit event is recorded for a change that never persisted.
    expect(screen.queryByText(/moved from Admin to Analyst/)).not.toBeInTheDocument()
  })
})
