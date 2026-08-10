import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, EmptyState, useRegisterCommands, useToast } from '../../components/ui'
import {
  changePassword,
  getSecuritySettings,
  revokeSession,
  updateSecuritySetting,
} from '../../lib/api.js'
import { formatRelativeTime } from '../../components/app/scanPresentation.js'
import TeamBadge from '../../components/app/TeamBadge.jsx'
import { useDemoState, withDemoOverride } from '../../lib/useDemoState.js'
import { useResource } from '../../lib/useResource.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-stone-light bg-parchment px-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-charcoal">{label}</p>
        {description && <p className="mt-1 text-sm leading-relaxed text-charcoal-mid">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`ui-focus-ring relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:pointer-events-none disabled:opacity-45 ${
          checked ? 'bg-charcoal' : 'bg-stone-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function DeviceIcon() {
  return (
    <svg
      className="h-8 w-8 rounded-lg border border-stone-light bg-parchment p-1.5 text-charcoal-mid"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="11" rx="2" />
      <path strokeLinecap="round" d="M9 20h6M12 15v5" />
    </svg>
  )
}

function SessionRow({ session, onRevoke, busy }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-stone-light bg-parchment px-4 py-4">
      <DeviceIcon />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-charcoal">{session.device}</p>
          {session.isCurrent && <Badge tone="success" size="sm">This device</Badge>}
          {session.teamId && <TeamBadge teamId={session.teamId} />}
        </div>
        <p className="mt-1 text-xs text-charcoal-mid">
          {session.location} · {session.ipAddress}
        </p>
        <p className="mt-0.5 text-[11px] text-charcoal-light">
          Last active {formatRelativeTime(session.lastActiveAt)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        disabled={session.isCurrent || busy}
        onClick={() => onRevoke(session)}
      >
        Revoke
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AppSecurityPage() {
  const toast = useToast()
  const demoState = useDemoState()

  const resource = useResource(() => getSecuritySettings().then((r) => r || {}))
  const settings = withDemoOverride(resource, demoState, {
    emptyData: {
      passwordPolicy: null,
      activeSessions: [],
      signInControls: null,
    },
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [revokeBusyId, setRevokeBusyId] = useState(null)
  const [localSessions, setLocalSessions] = useState(null)
  const [localControls, setLocalControls] = useState(null)

  const status = settings.status
  const loading = status === 'loading'
  const failed = status === 'error'

  const sessions = localSessions || settings.data?.activeSessions || []
  const controls = localControls || settings.data?.signInControls || null
  const passwordPolicy = settings.data?.passwordPolicy || null

  // Fresh reload of the resource (or demo override) should not carry stale
  // local mutations — a refetch means "sync with the server again", so local
  // revokes/toggles reset. The mock persists 2FA + session revokes at the
  // module level, so navigating away and back keeps them.
  useEffect(() => {
    setLocalSessions(null)
    setLocalControls(null)
  }, [settings.status])

  const passwordChecks = useMemo(() => {
    if (!passwordPolicy) return []
    const value = passwordForm.newPassword
    return [
      {
        label: `At least ${passwordPolicy.minLength} characters`,
        ok: value.length >= (passwordPolicy.minLength || 8),
      },
      { label: 'One uppercase letter', ok: passwordPolicy.requireUppercase ? /[A-Z]/.test(value) : true },
      { label: 'One number', ok: passwordPolicy.requireNumber ? /\d/.test(value) : true },
      { label: 'One symbol', ok: passwordPolicy.requireSymbol ? /[^A-Za-z0-9]/.test(value) : true },
    ]
  }, [passwordPolicy, passwordForm.newPassword])

  const handlePasswordChange = (field) => (event) => {
    setPasswordForm((current) => ({ ...current, [field]: event.target.value }))
    setPasswordError('')
    setPasswordSuccess('')
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }
    if (passwordChecks.some((check) => !check.ok)) {
      setPasswordError('New password does not meet the requirements.')
      return
    }

    setIsChangingPassword(true)
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordSuccess('Password updated. Other active sessions have been signed out.')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Password updated')
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Password could not be changed.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  async function handleRevoke(session) {
    setRevokeBusyId(session.id)
    try {
      await revokeSession(session.id)
      setLocalSessions((current) =>
        (current || settings.data?.activeSessions || []).filter((s) => s.id !== session.id),
      )
      toast.success(`Session revoked`, {
        description: `${session.device} signed out.`,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Session could not be revoked.')
    } finally {
      setRevokeBusyId(null)
    }
  }

  async function handleToggle(key, nextValue, toastLabel) {
    // Shape-aware toggle: the mock stores 2FA as an object ({ enabled }) while
    // the notify flags are plain booleans — write the same shape back so the
    // checked reads stay correct for both.
    setLocalControls((current) => {
      const base = current || settings.data?.signInControls || {}
      const next = typeof base[key] === 'object' && base[key] !== null
        ? { ...base[key], enabled: nextValue }
        : nextValue
      return { ...base, [key]: next }
    })
    try {
      await updateSecuritySetting(key, nextValue)
      toast.success(toastLabel)
    } catch (error) {
      // Roll back the optimistic toggle on failure.
      setLocalControls((current) => {
        const base = current || settings.data?.signInControls || {}
        const prev = typeof base[key] === 'object' && base[key] !== null
          ? { ...base[key], enabled: !nextValue }
          : !nextValue
        return { ...base, [key]: prev }
      })
      toast.error(error instanceof Error ? error.message : 'Setting could not be updated.')
    }
  }

  const twoFactorEnabled = controls?.twoFactorAuth?.enabled === true

  useRegisterCommands(
    [
      {
        id: 'security.change-password',
        group: 'Security',
        label: 'Change password',
        hint: 'Rotate your account password',
        keywords: ['security', 'password', 'rotate', 'credentials'],
        onSelect: () => {
          document.getElementById('security-password-current')?.focus()
        },
      },
      {
        id: 'security.revoke-other-sessions',
        group: 'Security',
        label: 'Revoke all other sessions',
        hint: `${sessions.filter((s) => !s.isCurrent).length} other device${sessions.filter((s) => !s.isCurrent).length === 1 ? '' : 's'}`,
        keywords: ['security', 'session', 'revoke', 'sign out'],
        onSelect: async () => {
          const others = sessions.filter((s) => !s.isCurrent)
          for (const session of others) {
            await handleRevoke(session)
          }
        },
      },
      {
        id: 'security.toggle-2fa',
        group: 'Security',
        label: twoFactorEnabled ? 'Disable two-factor authentication' : 'Enable two-factor authentication',
        hint: twoFactorEnabled ? 'Currently on' : 'Currently off',
        keywords: ['security', 'two-factor', '2fa', 'mfa'],
        onSelect: () =>
          handleToggle('twoFactorAuth', !twoFactorEnabled, twoFactorEnabled ? 'Two-factor authentication disabled' : 'Two-factor authentication enabled'),
      },
    ],
    [sessions, twoFactorEnabled, settings.data],
  )

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Security
        </p>
        <h2 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">
          Password, sessions, and sign-in
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Manage your account credentials, review where you are signed in, and
          control how Provance protects access to your workspace.
        </p>
      </section>

      {/* ── 1. Password change ───────────────────────────────────────────── */}
      <Card
        eyebrow="Password"
        title="Change password"
        description="Rotating your password signs out other active sessions for safety."
      >
        <form onSubmit={handlePasswordSubmit} className="max-w-xl">
          <label className="block">
            <span className="text-sm font-medium text-charcoal">Current password</span>
            <input
              id="security-password-current"
              type="password"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange('currentPassword')}
              required
              disabled={isChangingPassword}
              className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-medium text-charcoal">New password</span>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange('newPassword')}
              required
              disabled={isChangingPassword}
              className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
            />
          </label>

          {passwordPolicy && (
            <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {passwordChecks.map((check) => (
                <li
                  key={check.label}
                  className={`flex items-center gap-2 text-xs ${
                    check.ok ? 'text-emerald-700' : 'text-charcoal-light'
                  }`}
                >
                  <span aria-hidden="true">{check.ok ? '✓' : '○'}</span>
                  {check.label}
                </li>
              ))}
            </ul>
          )}

          <label className="mt-5 block">
            <span className="text-sm font-medium text-charcoal">Confirm new password</span>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange('confirmPassword')}
              required
              disabled={isChangingPassword}
              className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
            />
          </label>

          {passwordError && (
            <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {passwordSuccess}
            </div>
          )}

          <Button type="submit" variant="primary" disabled={isChangingPassword} className="mt-6">
            {isChangingPassword ? 'Updating password...' : 'Update password'}
          </Button>
        </form>
      </Card>

      {/* ── 2. Active sessions ───────────────────────────────────────────── */}
      <Card
        eyebrow="Active sessions"
        title="Where you are signed in"
        description="Devices with access to your account. Revoking a session signs that device out immediately."
        state={failed ? 'error' : loading ? 'loading' : 'default'}
        errorDescription={settings.error}
        onRetry={settings.reload}
        loadingRows={3}
      >
        {!loading && !failed && sessions.length === 0 && (
          <EmptyState
            variant="empty"
            title="No active sessions"
            description="No signed-in devices are currently tracked."
            compact
          />
        )}
        {!loading && !failed && sessions.length > 0 && (
          <div className="space-y-4">
            {sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                busy={revokeBusyId === session.id}
                onRevoke={handleRevoke}
              />
            ))}
          </div>
        )}
      </Card>

      {/* ── 3. Sign-in controls ──────────────────────────────────────────── */}
      <Card
        eyebrow="Sign-in controls"
        title="Protection preferences"
        description="Additional safeguards for accessing your workspace."
        state={failed ? 'error' : loading ? 'loading' : 'default'}
        errorDescription={settings.error}
        onRetry={settings.reload}
        loadingRows={2}
      >
        {!loading && !failed && controls && (
          <div className="space-y-4">
            <Switch
              checked={twoFactorEnabled}
              onChange={(next) =>
                handleToggle('twoFactorAuth', next, next ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled')
              }
              label="Two-factor authentication"
              description="Require a verification code from an authenticator app at sign-in. Preview action — not wired to a real 2FA provider yet."
            />
            <Switch
              checked={controls.notifyOnNewDevice === true}
              onChange={(next) => handleToggle('notifyOnNewDevice', next, 'New-device alerts updated')}
              label="Alert me about new devices"
              description="Get an email when a new device signs in to your account."
            />
            <Switch
              checked={controls.notifyOnPasswordChange === true}
              onChange={(next) => handleToggle('notifyOnPasswordChange', next, 'Password-change alerts updated')}
              label="Alert me about password changes"
              description="Get an email whenever the account password is changed."
            />

            <label className="block rounded-2xl border border-stone-light bg-parchment px-4 py-4">
              <span className="text-sm font-medium text-charcoal">Auto sign-out after</span>
              <select
                value={controls.sessionTimeoutMinutes ?? 60}
                onChange={async (event) => {
                  const value = Number(event.target.value)
                  setLocalControls((current) => {
                    const base = current || settings.data?.signInControls || {}
                    return { ...base, sessionTimeoutMinutes: value }
                  })
                  try {
                    await updateSecuritySetting('sessionTimeoutMinutes', value)
                    toast.success(`Auto sign-out set to ${value} minutes`)
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Setting could not be updated.')
                  }
                }}
                className="mt-2 w-full rounded-xl border border-stone-light bg-white-warm px-4 py-3 text-sm text-charcoal"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={240}>4 hours</option>
                <option value={1440}>1 day</option>
              </select>
            </label>
          </div>
        )}
        {!loading && !failed && !controls && (
          <EmptyState
            variant="empty"
            title="No sign-in controls available"
            description="Protection preferences are not configured for this account yet."
            compact
          />
        )}
      </Card>
    </div>
  )
}
