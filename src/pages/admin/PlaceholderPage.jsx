import AppStatePanel from '../../components/app/AppStatePanel.jsx'

const MODULE_DETAILS = {
  users: {
    label: 'User Management',
    description: 'Browse user accounts, review profiles, assign roles, and manage team access. Full user CRUD will be delivered in a future phase.',
  },
  organizations: {
    label: 'Organization Management',
    description: 'Manage organization records including members, roles, invitations, and activity settings.',
  },
  jobs: {
    label: 'Verification Jobs',
    description: 'Global job ledger showing every verification job across the platform. Drill into timeline, status, and failure details.',
  },
  reports: {
    label: 'Reports Management',
    description: 'Browse all verification reports with metadata, verdicts, and signal breakdowns.',
  },
  analytics: {
    label: 'Analytics',
    description: 'Trends and dashboards for scan volume, completion rate, failure rate, and adoption metrics.',
  },
  monitoring: {
    label: 'System Monitoring',
    description: 'Real-time queue health, storage utilization, database performance, and external service status.',
  },
  'feature-flags': {
    label: 'Feature Flags',
    description: 'Manage feature toggles, enable or disable functionality with confirmation, and configure rollout models.',
  },
  roles: {
    label: 'Roles & Permissions',
    description: 'Define RBAC roles, permission matrices, and assign capabilities across the platform.',
  },
  'audit-logs': {
    label: 'Audit Logs',
    description: 'Searchable, filterable log of all admin actions across the platform with actor, action, date, and resource details.',
  },
  settings: {
    label: 'Admin Settings',
    description: 'Environment readout, operational toggles, and system configuration.',
  },
}

export default function PlaceholderPage({ module }) {
  const details = MODULE_DETAILS[module] || {
    label: module || 'Module',
    description: 'This module is under development and will be available in a future phase.',
  }

  return (
    <AppStatePanel
      label="Coming soon"
      title={details.label}
      description={details.description}
      variant="empty"
    >
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href="/app/admin/overview"
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-light px-4 py-2.5 text-sm text-charcoal transition hover:border-charcoal"
        >
          ← Back to overview
        </a>
      </div>
    </AppStatePanel>
  )
}
