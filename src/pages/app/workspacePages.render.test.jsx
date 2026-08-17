// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext.jsx'
import { ToastProvider } from '../../components/ui'
import AppDashboardPage from './AppDashboardPage.jsx'
import AppHistoryPage from './AppHistoryPage.jsx'
import AppQueuePage from './AppQueuePage.jsx'
import AppReportsPage from './AppReportsPage.jsx'

// All four workspace pages consume the shared useTeamScoping hook. This
// smoke ensures each still mounts without crashing — a hook-order regression
// (e.g. "Cannot access 'scans' before initialization") slips past build +
// unit tests because nothing renders the pages.
describe('workspace pages render (useTeamScoping consumers)', () => {
  it('renders Reports without crashing', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <AppReportsPage />
        </ToastProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('Verification history and reports')).toBeInTheDocument()
  })

  it('renders Queue without crashing', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <AppQueuePage />
        </ToastProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('Live pipeline posture')).toBeInTheDocument()
  })

  it('renders History without crashing', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <AppHistoryPage />
        </ToastProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('Every verification run')).toBeInTheDocument()
  })

  it('renders the Dashboard without crashing', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ToastProvider>
            <AppDashboardPage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText(/Good (morning|afternoon|evening)/)).toBeInTheDocument()
  })
})
