import { useEffect, useState } from 'react'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function AppAccountPage() {
  const { profile, permissions, updateProfile } = useAuth()
  const [formState, setFormState] = useState({
    displayName: '',
    organization: '',
    roleTitle: '',
    defaultWorkspace: 'individual',
    emailNotifications: true,
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (profile) {
      setFormState(profile)
    }
  }, [profile])

  const handleChange = (field) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value

    setFormState((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSubmit = (event) => {
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

    updateProfile({
      ...formState,
      displayName: formState.displayName.trim(),
      organization: formState.organization.trim(),
      roleTitle: formState.roleTitle.trim(),
    })
    setSuccessMessage('Account preferences saved.')
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
          Account
        </p>
        <h2 className="mt-3 font-serif text-4xl text-charcoal">
          Profile and workspace preferences
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Basic settings are available now so you have a stable account surface while
          deeper profile management and organization controls are still being built.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm"
        >
          <div className="grid gap-5 md:grid-cols-2">
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
            className="mt-6 inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
          >
            Save account settings
          </button>
        </form>

        <AppStatePanel
          label="Success"
          title="Preference saving is active"
          description="This account surface lets you manage display information and workspace defaults before deeper account APIs are introduced."
          variant="success"
        />
      </div>
    </div>
  )
}
