import { useCallback, useEffect, useRef, useState } from 'react'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

function ProfileCardSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
      <div className="flex items-center gap-5">
        <div className="h-14 w-14 rounded-full bg-stone-light" />
        <div className="space-y-3 flex-1">
          <div className="h-7 w-40 rounded-lg bg-stone-light" />
          <div className="h-4 w-28 rounded-lg bg-stone-light" />
        </div>
      </div>
      <div className="mt-8 space-y-4">
        <div className="h-12 rounded-xl bg-stone-light" />
        <div className="h-12 rounded-xl bg-stone-light" />
      </div>
    </div>
  )
}

export default function AppAccountPage() {
  const { user, profile, isLoading, updateProfile } = useAuth()

  const [editMode, setEditMode] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [inlineError, setInlineError] = useState('')
  const [pageError, setPageError] = useState('')
  const inputRef = useRef(null)

  // Sync edit value when profile loads or changes
  useEffect(() => {
    if (profile?.displayName) {
      setEditValue(profile.displayName)
    }
  }, [profile?.displayName])

  // Focus input when entering edit mode
  useEffect(() => {
    if (editMode && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editMode])

  const enterEditMode = useCallback(() => {
    setEditValue(profile?.displayName || '')
    setInlineError('')
    setEditMode(true)
  }, [profile?.displayName])

  const cancelEdit = useCallback(() => {
    setEditValue(profile?.displayName || '')
    setInlineError('')
    setEditMode(false)
  }, [profile?.displayName])

  const saveEdit = useCallback(async () => {
    const trimmed = editValue.trim()
    if (!trimmed) {
      setInlineError('Display name is required.')
      return
    }

    if (trimmed === profile?.displayName) {
      setEditMode(false)
      return
    }

    try {
      setIsSaving(true)
      setInlineError('')
      await updateProfile({ displayName: trimmed })
      setEditMode(false)
    } catch (error) {
      setInlineError(error.message || 'Could not save display name.')
    } finally {
      setIsSaving(false)
    }
  }, [editValue, profile?.displayName, updateProfile])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        void saveEdit()
      } else if (e.key === 'Escape') {
        cancelEdit()
      }
    },
    [saveEdit, cancelEdit],
  )

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-8">
        <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-20 rounded-lg bg-stone-light" />
            <div className="h-9 w-64 rounded-lg bg-stone-light" />
            <div className="h-5 w-96 rounded-lg bg-stone-light" />
          </div>
        </section>
        <ProfileCardSkeleton />
      </div>
    )
  }

  // Error: no profile available
  if (!profile) {
    return (
      <div className="space-y-8">
        <AppStatePanel
          label="Error"
          title="Could not load profile"
          description="We were unable to load your account profile. Please refresh the page or try signing out and back in."
          variant="error"
        />
      </div>
    )
  }

  const initials = getInitials(profile.displayName)
  const roleLabel = profile.accountRole
    ? profile.accountRole.charAt(0).toUpperCase() + profile.accountRole.slice(1)
    : 'Member'

  return (
    <div className="space-y-8">
      {/* Page error banner */}
      {pageError && (
        <AppStatePanel
          label="Error"
          title="Something went wrong"
          description={pageError}
          variant="error"
        />
      )}

      {/* Header */}
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
          Account
        </p>
        <h2 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">
          Profile
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Manage your personal profile details and account preferences.
        </p>
      </section>

      {/* 1. Profile Card */}
      <section className="rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-charcoal text-lg font-semibold text-white-warm font-serif">
            {initials}
          </div>

          {/* Profile details */}
          <div className="flex-1 space-y-6">
            {/* Display name with inline edit */}
            <div>
              <span className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Display name
              </span>
              {editMode ? (
                <div className="mt-2 space-y-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => {
                      setEditValue(e.target.value)
                      setInlineError('')
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={isSaving}
                    className="field-input text-2xl font-semibold"
                    autoComplete="off"
                  />
                  {inlineError && (
                    <p className="text-sm text-rose-600">{inlineError}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void saveEdit()}
                      disabled={isSaving}
                      className="rounded-xl bg-charcoal px-4 py-2 text-sm font-medium text-parchment transition hover:bg-charcoal-soft disabled:opacity-50"
                    >
                      {isSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={isSaving}
                      className="rounded-xl border border-stone-light bg-parchment px-4 py-2 text-sm font-medium text-charcoal-mid transition hover:bg-stone-light"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-3">
                  <h3 className="text-2xl font-semibold text-charcoal">
                    {profile.displayName}
                  </h3>
                  <button
                    type="button"
                    onClick={enterEditMode}
                    className="rounded-lg px-3 py-1 text-sm font-medium text-trust transition hover:bg-trust-soft"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Email — read-only */}
            <div>
              <span className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Email
              </span>
              <p className="mt-1 text-base text-charcoal">
                {user?.email || '—'}
              </p>
            </div>

            {/* Organization — read-only */}
            <div>
              <span className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Organization
              </span>
              <p className="mt-1 text-base text-charcoal">
                {profile.organization || '—'}
              </p>
            </div>

            {/* Role badge pill */}
            <div>
              <span className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Role
              </span>
              <span className="ml-3 inline-flex items-center rounded-full border border-stone-light bg-parchment px-3 py-1 text-xs font-medium text-charcoal-mid">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Password & security */}
      <AppStatePanel
        label="Coming soon"
        title="Password &amp; security"
        description="Password changes, two-factor authentication, and security key management will be available in a future update."
        variant="empty"
      />

      {/* 3. Active sessions */}
      <AppStatePanel
        label="Coming soon"
        title="Active sessions"
        description="View and manage your active devices and sessions across browsers and locations."
        variant="empty"
      />

      {/* 4. Danger zone */}
      <section className="rounded-3xl border border-rose-200 bg-white-warm p-6 shadow-sm sm:p-8">
        <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-rose-700">
          Danger zone
        </span>
        <h2 className="mt-4 font-serif text-2xl text-charcoal">Delete account</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-mid">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <div className="mt-6">
          <button
            type="button"
            disabled
            className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-600 opacity-60"
          >
            Delete account
          </button>
        </div>
      </section>
    </div>
  )
}
