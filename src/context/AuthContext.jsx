import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  clearMemorySession,
  ensureSession,
  getCurrentViewer,
  getMemorySession,
  setMemorySession,
  signInWithPassword,
  signOut as apiSignOut,
  updateAccountProfile,
  USE_BETTER_AUTH,
  USE_MOCK,
} from '../lib/api'

const AUTH_STORAGE_KEY = 'provance.auth.session.v1'

const AuthContext = createContext(null)

function readJsonStorage(key) {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

function writeJsonStorage(key, value) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

function removeStorageValue(key) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(key)
}

function isSessionExpired(expiresAt) {
  return typeof expiresAt === 'number' && Date.now() >= expiresAt
}

function createDefaultProfile(email, permissions = { team: false }) {
  const localPart = typeof email === 'string' ? email.split('@')[0] : ''
  const normalizedName = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

  return {
    displayName: normalizedName || 'Provance User',
    organization: '',
    roleTitle: '',
    defaultWorkspace: 'individual',
    emailNotifications: true,
    accountRole: 'member',
    teamAccess: Boolean(permissions.team),
  }
}

function normalizePermissions(response) {
  const permissions = {
    individual: response?.permissions?.individual ?? true,
    team: response?.permissions?.team ?? false,
    admin: response?.permissions?.admin ?? false,
  }

  return permissions
}

function normalizeSessionPayload(session, fallbackSession = null) {
  const source = session || fallbackSession

  if (!source?.accessToken) {
    throw new Error('No usable authenticated session is available.')
  }

  return {
    accessToken: source.accessToken,
    refreshToken: source.refreshToken || fallbackSession?.refreshToken || null,
    tokenType: source.tokenType || fallbackSession?.tokenType || 'bearer',
    expiresAt:
      typeof source.expiresAt === 'number'
        ? source.expiresAt > 9999999999
          ? source.expiresAt
          : source.expiresAt * 1000
        : fallbackSession?.expiresAt || null,
  }
}

function normalizeAuthState(response, fallbackSession = null, workspaceOverride = null) {
  if (response?.status !== 'authenticated' || !response?.user?.id || !response?.user?.email) {
    throw new Error('Authentication did not return a usable user payload.')
  }

  const permissions = normalizePermissions(response)
  const defaultProfile = {
    ...createDefaultProfile(response.user.email, permissions),
    ...(response.profile || {}),
  }
  const requestedWorkspace =
    workspaceOverride || defaultProfile.defaultWorkspace || 'individual'

  return {
    user: {
      id: response.user.id,
      email: response.user.email,
    },
    session: normalizeSessionPayload(response.session, fallbackSession),
    permissions,
    profile: {
      ...defaultProfile,
      defaultWorkspace:
        requestedWorkspace === 'team' && !permissions.team
          ? 'individual'
          : requestedWorkspace,
    },
    workspaceContext:
      requestedWorkspace === 'team' && permissions.team ? 'team' : 'individual',
  }
}

function writeStoredSession(sessionData) {
  writeJsonStorage(AUTH_STORAGE_KEY, sessionData)
}

function restoreStoredSession() {
  const storedSession = readJsonStorage(AUTH_STORAGE_KEY)

  if (!storedSession) {
    return null
  }

  if (isSessionExpired(storedSession.session?.expiresAt)) {
    removeStorageValue(AUTH_STORAGE_KEY)
    return null
  }

  return {
    ...storedSession,
    profile: {
      ...createDefaultProfile(storedSession.user?.email, storedSession.permissions),
      ...(storedSession.profile || {}),
    },
  }
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    status: 'loading',
    sessionData: null,
  })

  useEffect(() => {
    let isCancelled = false

    // Better Auth mode: the session cookie lives on the backend origin
    // (httpOnly) and there is no GoTrue refresh-token dance — getSession() IS
    // the check. getCurrentViewer() throws when no cookie exists.
    async function hydrateBetterSession() {
      try {
        const viewer = await getCurrentViewer()
        const nextSession = normalizeAuthState(viewer, null)

        if (isCancelled) {
          return
        }

        setMemorySession(nextSession.session)
        setAuthState({ status: 'ready', sessionData: nextSession })
      } catch {
        if (isCancelled) {
          return
        }

        clearMemorySession()
        setAuthState({ status: 'ready', sessionData: null })
      }
    }

    // Real mode (USE_MOCK = false): nothing is persisted — the access token
    // lives in module memory and the refresh token in the backend's httpOnly
    // cookie. On boot we attempt a silent cookie refresh; if the cookie is
    // present the backend rotates it and hands back a fresh access token, then
    // the viewer payload rebuilds the full auth state.
    async function hydrateRealSession() {
      const accessToken = await ensureSession()

      if (isCancelled) {
        return
      }

      if (!accessToken) {
        setAuthState({ status: 'ready', sessionData: null })
        return
      }

      try {
        const viewer = await getCurrentViewer()
        // /auth/me returns viewer state without a session block, so the
        // access token + expiry come from the memory session the cookie
        // refresh just minted (normalizeSessionPayload falls back to it).
        const nextSession = normalizeAuthState(viewer, getMemorySession())

        if (isCancelled) {
          return
        }

        setMemorySession(nextSession.session)
        setAuthState({ status: 'ready', sessionData: nextSession })
      } catch {
        if (isCancelled) {
          return
        }

        clearMemorySession()
        setAuthState({ status: 'ready', sessionData: null })
      }
    }

    if (USE_BETTER_AUTH) {
      void hydrateBetterSession()
    } else if (USE_MOCK) {
      const restoredSession = restoreStoredSession()

      if (!restoredSession) {
        setAuthState({ status: 'ready', sessionData: null })
        return
      }

      setAuthState({ status: 'hydrating', sessionData: restoredSession })

      void (async () => {
        try {
          const viewer = await getCurrentViewer()
          const nextSession = normalizeAuthState(
            viewer,
            restoredSession.session,
            restoredSession.workspaceContext,
          )

          if (isCancelled) {
            return
          }

          writeStoredSession(nextSession)
          setAuthState({ status: 'ready', sessionData: nextSession })
        } catch {
          if (isCancelled) {
            return
          }

          removeStorageValue(AUTH_STORAGE_KEY)
          setAuthState({ status: 'ready', sessionData: null })
        }
      })()
    } else {
      void hydrateRealSession()
    }

    return () => {
      isCancelled = true
    }
  }, [])

  const signIn = useCallback(async (credentials) => {
    const response = await signInWithPassword(credentials)
    const nextSession = normalizeAuthState(response)

    // Real mode: the refresh token arrives in the httpOnly cookie (the
    // response body is stripped of it), so only the access token is cached in
    // memory — never localStorage. Mock mode keeps the persisted session so
    // demos survive reloads.
    setMemorySession(nextSession.session)

    if (USE_MOCK) {
      writeStoredSession(nextSession)
    }

    setAuthState({
      status: 'ready',
      sessionData: nextSession,
    })

    return nextSession
  }, [])

  const signOut = useCallback(() => {
    // Clear local state immediately so sign-out feels instant even if the
    // server round-trip is slow or the API is unreachable. Real mode drops
    // the in-memory access token; mock mode also clears the persisted session.
    clearMemorySession()

    if (USE_MOCK) {
      removeStorageValue(AUTH_STORAGE_KEY)
    }

    setAuthState((current) => ({
      status: current.status,
      sessionData: null,
    }))

    // Best-effort server-side sign-out (burns the refresh token and clears
    // the cookie). Never blocks or fails the local sign-out.
    void apiSignOut().catch(() => undefined)
  }, [])

  const updateProfile = useCallback(async (updates) => {
    const response = await updateAccountProfile(updates)

    setAuthState((current) => {
      if (!current.sessionData) {
        return current
      }

      const nextProfile = {
        ...current.sessionData.profile,
        ...(response.profile || {}),
      }
      const nextPermissions = response.permissions || current.sessionData.permissions
      const nextWorkspace =
        nextProfile.defaultWorkspace === 'team' && nextPermissions.team
          ? 'team'
          : 'individual'
      const nextSessionData = {
        ...current.sessionData,
        permissions: nextPermissions,
        profile: nextProfile,
        workspaceContext: nextWorkspace,
      }

      if (USE_MOCK) {
        writeStoredSession(nextSessionData)
      }

      return {
        ...current,
        sessionData: nextSessionData,
      }
    })

    return response
  }, [])

  const setWorkspaceContext = useCallback((workspaceContext) => {
    setAuthState((current) => {
      if (!current.sessionData) {
        return current
      }

      if (workspaceContext === 'team' && !current.sessionData.permissions.team) {
        return current
      }

      const nextSessionData = {
        ...current.sessionData,
        workspaceContext,
      }

      if (USE_MOCK) {
        writeStoredSession(nextSessionData)
      }

      return {
        ...current,
        sessionData: nextSessionData,
      }
    })
  }, [])

  const value = useMemo(() => {
    const sessionData =
      authState.sessionData && !isSessionExpired(authState.sessionData.session?.expiresAt)
        ? authState.sessionData
        : null

    if (!sessionData && authState.sessionData) {
      // Expired or missing token — drop the in-memory copy; clear persisted
      // storage only in mock mode (real mode never writes it).
      clearMemorySession()

      if (USE_MOCK) {
        removeStorageValue(AUTH_STORAGE_KEY)
      }
    }

    return {
      isLoading: authState.status !== 'ready',
      isAuthenticated: Boolean(sessionData),
      user: sessionData?.user ?? null,
      session: sessionData?.session ?? null,
      profile: sessionData?.profile ?? null,
      permissions: sessionData?.permissions ?? {
        individual: false,
        team: false,
        admin: false,
      },
      workspaceContext: sessionData?.workspaceContext ?? 'individual',
      signIn,
      signOut,
      updateProfile,
      setWorkspaceContext,
    }
  }, [authState.sessionData, authState.status, setWorkspaceContext, signIn, signOut, updateProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
