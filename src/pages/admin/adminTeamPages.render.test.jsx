// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../components/ui'
import OrganizationsPage from './OrganizationsPage.jsx'
import UsersPage from './UsersPage.jsx'

// Both admin pages consume the URL-backed team filter (useTeamFilterParam) to
// make admin views linkable via ?team=, and render the shared TeamFilter (now
// with a one-click Copy link affordance that uses the toast system). These
// smokes ensure they still mount with a team param present, so derivation
// regressions fail CI.
describe('admin team-scoped pages render', () => {
  it('renders Users with ?team= without crashing', () => {
    render(
      <MemoryRouter initialEntries={['/app/admin/users?team=team_legal']}>
        <ToastProvider>
          <UsersPage />
        </ToastProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('Manage account access and roles')).toBeInTheDocument()
    expect(screen.getByLabelText('Copy shareable link')).toBeInTheDocument()
  })

  it('renders Organizations with ?team= without crashing', () => {
    render(
      <MemoryRouter initialEntries={['/app/admin/organizations?team=team_legal']}>
        <ToastProvider>
          <OrganizationsPage />
        </ToastProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('Inspect workspace structure and posture')).toBeInTheDocument()
    expect(screen.getByLabelText('Copy shareable link')).toBeInTheDocument()
  })
})
