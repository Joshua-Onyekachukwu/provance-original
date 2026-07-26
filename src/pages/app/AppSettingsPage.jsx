import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'

const TABS = [
  { key: 'security', label: 'Security' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'appearance', label: 'Appearance' },
]

const NOTIFICATION_TOGGLES = [
  {
    key: 'scanCompletions',
    label: 'Scan completions',
    description: 'Get notified when a submitted media scan finishes processing.',
    defaultEnabled: true,
  },
  {
    key: 'securityAlerts',
    label: 'Security alerts',
    description: 'Receive alerts for suspicious activity, new sign-ins, or account changes.',
    defaultEnabled: true,
  },
  {
    key: 'productUpdates',
    label: 'Product updates',
    description: 'Stay informed about new features, improvements, and platform changes.',
    defaultEnabled: false,
  },
  {
    key: 'billingInvoices',
    label: 'Billing & invoices',
    description: 'Notifications about subscription changes, upcoming invoices, and payment receipts.',
    defaultEnabled: true,
  },
]

function ToggleSwitch({ enabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-charcoal/20 focus-visible:ring-offset-2 ${
        enabled ? 'bg-charcoal' : 'bg-stone-light'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function AppSettingsPage() {
  const [activeTab, setActiveTab] = useState('security')
  const [notifications, setNotifications] = useState(
    Object.fromEntries(
      NOTIFICATION_TOGGLES.map((t) => [t.key, t.defaultEnabled]),
    ),
  )

  const handleNotificationToggle = (key) => (value) => {
    setNotifications((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-8">
      {/* Tab bar */}
      <div className="inline-flex gap-1 rounded-2xl border border-stone-light bg-parchment p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-white-warm text-charcoal shadow-sm'
                : 'text-charcoal-mid hover:text-charcoal'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Security */}
      {activeTab === 'security' && (
        <AppStatePanel
          label="Coming soon"
          title="Password management will be available in a future update"
          description="Reset your password now using the link below if you need immediate access changes."
          variant="empty"
          action={
            <Link
              to="/reset-password"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal hover:text-charcoal-soft transition"
            >
              Reset password
              <span aria-hidden="true">&rarr;</span>
            </Link>
          }
        />
      )}

      {/* Tab: Notifications */}
      {activeTab === 'notifications' && (
        <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
            Preferences
          </p>
          <h2 className="mt-3 font-serif text-2xl text-charcoal">
            Notification settings
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-mid">
            Choose which notifications you want to receive. These preferences are
            saved to your account and apply across all workspaces.
          </p>

          <div className="mt-6">
            {NOTIFICATION_TOGGLES.map((item, index) => (
              <div
                key={item.key}
                className={`flex items-center justify-between py-4 ${
                  index < NOTIFICATION_TOGGLES.length - 1
                    ? 'border-b border-stone-light'
                    : ''
                }`}
              >
                <div className="max-w-md pr-4">
                  <p className="text-sm font-medium text-charcoal">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-charcoal-mid">
                    {item.description}
                  </p>
                </div>
                <ToggleSwitch
                  enabled={notifications[item.key]}
                  onChange={handleNotificationToggle(item.key)}
                  label={item.label}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab: Appearance */}
      {activeTab === 'appearance' && (
        <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Theme
              </p>
              <h2 className="mt-3 font-serif text-2xl text-charcoal">
                Appearance
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-mid">
                Provance currently supports light mode. Dark mode coming in a
                future release.
              </p>
            </div>
            <span className="inline-flex shrink-0 rounded-full border border-stone-light bg-parchment px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-charcoal-mid">
              Light mode
            </span>
          </div>
        </section>
      )}
    </div>
  )
}
