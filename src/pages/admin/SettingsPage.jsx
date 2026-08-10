import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, useRegisterCommands, useToast } from '../../components/ui/index.js'
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx'
import { formatDateTime } from '../../components/app/scanPresentation.js'
import { getAdminSettings } from '../../lib/api.js'
import { useDemoState } from '../../lib/useDemoState.js'
import useMockData from '../../lib/useMockData.js'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const demoState = useDemoState()

  const { data: rawData, loading, error, refetch } = useMockData(getAdminSettings)
  const EMPTY_SETTINGS = useMemo(
    () => ({
      environment: { name: '', region: '', api_version: '', worker_version: '', app_commit: '', deployed_at: '' },
      operational: [],
      security: {},
    }),
    [],
  )
  const data = demoState === 'empty' ? EMPTY_SETTINGS : rawData

  const isLoading = loading || demoState === 'loading'
  const hasError = Boolean(error) || demoState === 'error'

  const settings = data || EMPTY_SETTINGS
  const environment = settings.environment || EMPTY_SETTINGS.environment
  const operational = useMemo(() => settings.operational || [], [settings])

  const [toggles, setToggles] = useState(operational)
  const [synced, setSynced] = useState(false)
  if (!synced && operational.length > 0) {
    setToggles(operational)
    setSynced(true)
  }

  const enabledCount = useMemo(() => toggles.filter((item) => item.enabled).length, [toggles])

  function handleToggle(key) {
    setToggles((current) =>
      current.map((item) => (item.key === key ? { ...item, enabled: !item.enabled } : item)),
    )
  }

  function handleValueChange(key, value) {
    setToggles((current) =>
      current.map((item) => (item.key === key ? { ...item, value } : item)),
    )
  }

  function handleSave() {
    toast('Settings saved', {
      description: 'Operational configuration updated in mock mode.',
      type: 'success',
    })
  }

  useRegisterCommands(
    [
      {
        id: 'admin.settings-save',
        group: 'Settings',
        label: 'Save admin settings',
        hint: `${enabledCount} toggles enabled`,
        keywords: ['settings', 'save', 'admin', 'config'],
        onSelect: handleSave,
      },
      {
        id: 'admin.settings-go-overview',
        group: 'Settings',
        label: 'Open platform overview',
        hint: 'Queue, health, and attention surfaces',
        keywords: ['settings', 'admin', 'overview', 'dashboard'],
        onSelect: () => navigate('/app/admin'),
      },
    ],
    [enabledCount, navigate, toast],
  )

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin Settings"
        title="Platform configuration"
        description="Environment readout and operational controls — maintenance mode, sign-ups, processing, upload limits, and retention."
        meta={[
          { label: environment.name || 'Environment' },
          { label: environment.region || 'Region' },
          { label: `v${environment.api_version || '—'}` },
          { label: `${enabledCount} toggles on` },
        ]}
        primaryAction={
          <Button variant="secondary" size="sm" onClick={handleSave}>
            Save settings
          </Button>
        }
      />

      {/* ── Environment readout ───────────────────────────────────────────── */}
      <Card
        eyebrow="Deployment"
        title="Environment"
        description="The running deployment this admin console is attached to."
        state={hasError ? 'error' : isLoading ? 'loading' : 'default'}
        errorDescription={hasError ? (demoState === 'error' ? 'Demo state — forced error for review. This is not a real outage.' : error) : ''}
        onRetry={refetch}
        loadingRows={2}
      >
        {!isLoading && !hasError && (
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Environment', environment.name || '—'],
              ['Region', environment.region || '—'],
              ['API version', environment.api_version ? `v${environment.api_version}` : '—'],
              ['Worker version', environment.worker_version ? `v${environment.worker_version}` : '—'],
              ['App commit', environment.app_commit || '—'],
              ['Deployed', environment.deployed_at ? formatDateTime(environment.deployed_at) : '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">{label}</dt>
                <dd className="mt-1 font-mono text-xs text-charcoal">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      {/* ── Operational controls ──────────────────────────────────────────── */}
      <Card
        eyebrow="Operations"
        title="Operational controls"
        description="Toggles and limits that gate the workspace. Changes persist in mock mode for the session."
        state={hasError ? 'error' : isLoading ? 'loading' : 'default'}
        errorDescription={hasError ? (demoState === 'error' ? 'Demo state — forced error for review. This is not a real outage.' : error) : ''}
        onRetry={refetch}
        loadingRows={3}
      >
        {!isLoading && !hasError && (
          <div className="divide-y divide-stone-light/70">
            {toggles.map((item) => (
              <div key={item.key} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-charcoal">{item.label}</span>
                    {item.kind === 'toggle' && (
                      <Badge tone={item.enabled ? 'success' : 'neutral'} size="sm">
                        {item.enabled ? 'On' : 'Off'}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-charcoal-mid">
                    {item.description}
                  </p>
                </div>

                {item.kind === 'toggle' ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(item.enabled)}
                    aria-label={item.label}
                    onClick={() => handleToggle(item.key)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                      item.enabled ? 'bg-charcoal' : 'bg-stone-light'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        item.enabled ? 'left-[1.375rem]' : 'left-0.5'
                      }`}
                    />
                  </button>
                ) : (
                  <div className="flex shrink-0 items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.value ?? ''}
                      onChange={(event) => handleValueChange(item.key, event.target.value)}
                      aria-label={item.label}
                      className="w-24 rounded-xl border border-stone-light bg-parchment px-3 py-2 text-right text-sm text-charcoal focus:border-charcoal focus:outline-none"
                    />
                    <span className="text-xs text-charcoal-light">
                      {item.key.includes('upload') ? 'MB' : 'days'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Security posture ──────────────────────────────────────────────── */}
      {!isLoading && !hasError && settings.security && (
        <Card eyebrow="Security" title="Security posture" description="Current security configuration for the platform.">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Session timeout', `${settings.security.session_timeout_minutes ?? '—'} min`],
              ['MFA enforced', settings.security.mfa_enforced ? 'Required' : 'Optional'],
              ['Audit retention', `${settings.security.audit_retention_days ?? '—'} days`],
              ['Sign-in allowlist', settings.security.allowlist_only_signins ? 'Enabled' : 'Disabled'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">{label}</dt>
                <dd className="mt-1 text-charcoal">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {/* Demo-state banner (dev-only) */}
      {demoState && (
        <div className="fixed bottom-4 right-4 z-[60] rounded-full border border-charcoal bg-charcoal px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-parchment shadow-lg">
          Demo state · {demoState}
        </div>
      )}
    </div>
  )
}
