import StatCard from '../../components/admin/StatCard.jsx'
import AdminTable from '../../components/admin/AdminTable.jsx'

const PLACEHOLDER_KPIS = [
  { label: 'Total users', value: '—', detail: 'All registered accounts across workspaces.', variant: 'default' },
  { label: 'Active users (7d)', value: '—', detail: 'Users with activity in the last 7 days.', variant: 'info' },
  { label: 'Scans today', value: '—', detail: 'Verification jobs submitted today.', variant: 'default' },
  { label: 'Completion rate', value: '—', detail: 'Percentage of scans that completed successfully.', variant: 'success' },
]

const RECENT_ACTIVITY_COLUMNS = [
  { key: 'action', label: 'Action', sortable: true },
  { key: 'actor', label: 'Actor', sortable: true },
  { key: 'resource', label: 'Resource', sortable: true },
  { key: 'timestamp', label: 'Timestamp', sortable: true },
]

const NEEDS_ATTENTION_COLUMNS = [
  { key: 'issue', label: 'Issue', sortable: true },
  { key: 'severity', label: 'Severity', sortable: true,
    render: (row) => (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.14em] ${
        row.severity === 'High'
          ? 'bg-rose-50 text-rose-700'
          : row.severity === 'Medium'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-sky-50 text-sky-700'
      }`}>
        {row.severity}
      </span>
    ),
  },
  { key: 'detail', label: 'Detail' },
  { key: 'since', label: 'Since', sortable: true },
]

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      {/* Hero section */}
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
          Internal control room
        </p>
        <h2 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">
          Admin overview
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Central command surface for Provance operations. Monitor platform health,
          review the waitlist, manage users, inspect verification jobs, and configure
          system settings from one workspace.
        </p>
      </section>

      {/* KPI Grid */}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Key metrics
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLACEHOLDER_KPIS.map((kpi) => (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              detail={kpi.detail}
              variant={kpi.variant}
            />
          ))}
        </div>
      </div>

      {/* Two-column: Recent Activity + Needs Attention */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Recent Activity */}
        <section>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Activity
          </p>
          <h3 className="mt-2 font-serif text-2xl text-charcoal">Recent activity</h3>
          <div className="mt-4">
            <AdminTable
              columns={RECENT_ACTIVITY_COLUMNS}
              data={[]}
              loading={false}
              emptyMessage="Activity feed will appear here once data is connected."
              filteredEmptyMessage="No activity matches your filters."
            />
          </div>
        </section>

        {/* Needs Attention */}
        <section>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Attention required
          </p>
          <h3 className="mt-2 font-serif text-2xl text-charcoal">Needs attention</h3>
          <div className="mt-4">
            <AdminTable
              columns={NEEDS_ATTENTION_COLUMNS}
              data={[]}
              loading={false}
              emptyMessage="No items require attention right now."
              filteredEmptyMessage="No attention items match your filters."
            />
          </div>
        </section>
      </div>

      {/* Quick links */}
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Shortcuts
        </p>
        <h3 className="mt-2 font-serif text-2xl text-charcoal">Admin modules</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Waitlist', desc: 'Review and approve applicants', href: '/app/admin/waitlist' },
            { label: 'Users', desc: 'Manage user accounts', href: '/app/admin/users' },
            { label: 'Jobs', desc: 'Monitor verification pipeline', href: '/app/admin/jobs' },
            { label: 'Audit Logs', desc: 'Review admin activity', href: '/app/admin/audit-logs' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-2xl border border-stone-light bg-parchment px-4 py-4 transition hover:border-charcoal/35"
            >
              <p className="text-sm font-medium text-charcoal">{link.label}</p>
              <p className="mt-1 text-xs text-charcoal-mid">{link.desc}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
