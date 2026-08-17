import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, EmptyState, useRegisterCommands } from '../../components/ui'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import DemoStateBanner from '../../components/app/DemoStateBanner.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useDemoStateControl } from '../../lib/useDemoState.js'

export default function AppAccountPage() {
  const navigate = useNavigate()
  const { profile, permissions, updateProfile } = useAuth()
  const { demoState, selectDemoState } = useDemoStateControl()
  const [formState, setFormState] = useState({
    displayName: '',
    organization: '',
    roleTitle: '',
    defaultWorkspace: 'individual',
    emailNotifications: true,
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setFormState(profile)
    }
  }, [profile])

  useRegisterCommands(
    [
      {
        id: 'account.security',
        group: 'Account',
        label: 'Open security settings',
        hint: 'Password and sessions',
        keywords: ['account', 'security', 'password', 'sessions'],
        onSelect: () => navigate('/app/security'),
      },
      {
        id: 'account.notifications',
        group: 'Account',
        label: 'Open notification preferences',
        hint: 'Alerts and digests',
        keywords: ['account', 'notifications', 'alerts', 'preferences'],
        onSelect: () => navigate('/app/notifications'),
      },
    ],
    [navigate],
  )

  const handleChange = (field) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value

    setFormState((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!formState.displayName.trim()) {
      setErrorMessage('Display name is required.')
      return
    }

    if (formState.defaultWorkspace === 'team' && !permissions.team) {
      setErrorMessage('Team workspace access is not enabled for this account.')
      return
    }

    // Dev-only demo: ?state=error forces a save failure so the inline error
    // surface can be reviewed/screenshotted without touching the real submit.
    if (demoState === 'error') {
      setErrorMessage(
        'Demo state — forced save failure for review. This is not a real error.',
      )
      return
    }

    try {
      setIsSaving(true)
      await updateProfile({
        ...formState,
        displayName: formState.displayName.trim(),
        organization: formState.organization.trim(),
        roleTitle: formState.roleTitle.trim(),
      })
      setSuccessMessage('Account preferences saved.')
    } catch (error) {
      setErrorMessage(error.message || 'Account preferences could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Account
        </p>
        <h2 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">
          Profile and workspace preferences
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Basic settings are available now so you have a stable account surface while
          deeper profile management and organization controls are still being built.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {demoState === 'loading' ? (
          <div
            role="status"
            aria-label="Loading account profile"
            className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={i >= 2 ? 'md:col-span-2' : ''}>
                  <div className="h-3.5 w-24 animate-pulse rounded bg-stone-light/70" />
                  <div className="mt-2 h-11 animate-pulse rounded-xl bg-stone-light/50" />
                </div>
              ))}
            </div>
            <div className="mt-6 h-10 w-44 animate-pulse rounded-xl bg-stone-light/50" />
          </div>
        ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8"
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-charcoal">Display name</span>
              <input
                type="text"
                value={formState.displayName}
                onChange={handleChange('displayName')}
                className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-charcoal">Role</span>
              <input
                type="text"
                value={formState.roleTitle}
                onChange={handleChange('roleTitle')}
                className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-charcoal">Organization</span>
              <input
                type="text"
                value={formState.organization}
                onChange={handleChange('organization')}
                className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-charcoal">Default workspace</span>
              <select
                value={formState.defaultWorkspace}
                onChange={handleChange('defaultWorkspace')}
                className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
              >
                <option value="individual">Individual</option>
                <option value="team" disabled={!permissions.team}>
                  Team
                </option>
              </select>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-stone-light bg-parchment px-4 py-4 md:col-span-2">
              <input
                type="checkbox"
                checked={formState.emailNotifications}
                onChange={handleChange('emailNotifications')}
                className="mt-1 h-4 w-4 rounded border-stone-light"
              />
              <span>
                <span className="block text-sm font-medium text-charcoal">
                  Email notifications
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-charcoal-mid">
                  Keep account updates, verification progress, and access notices enabled
                  for this profile.
                </span>
              </span>
            </label>
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="mt-6 inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
          >
            {isSaving ? 'Saving account settings...' : 'Save account settings'}
          </button>
        </form>
        )}

        {demoState === 'empty' ? (
          <EmptyState
            variant="empty"
            title="No profile details yet"
            description="This demo state shows how the account surface reads before profile data is available. Fill the form to persist your first profile."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => selectDemoState(null)}
              >
                Return to live view
              </Button>
            }
          />
        ) : demoState === 'error' ? (
          <AppStatePanel
            label="Save failed"
            title="Your changes were not saved"
            description="Demo state — submitting now returns a forced error so the inline failure surface can be reviewed. This is not a real outage."
            variant="error"
            action={
              <Button variant="secondary" size="sm" onClick={() => selectDemoState(null)}>
                Return to live view
              </Button>
            }
          />
        ) : (
          <AppStatePanel
            label="Success"
            title="Profile persistence is now active"
            description="This account surface now saves profile details through the backend so workspace identity and preferences are not limited to local browser state."
            variant="success"
          />
        )}
      </div>

      <DemoStateBanner demoState={demoState} onSelect={selectDemoState} />
    </div>
  )
}
