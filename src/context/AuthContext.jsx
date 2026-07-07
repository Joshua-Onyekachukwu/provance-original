import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { signInWithPassword } from '../lib/api'

const AUTH_STORAGE_KEY = 'provance.auth.session.v1'
const PROFILE_STORAGE_KEY = 'provance.auth.profile.v1'

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

function createDefaultProfile(email) {
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
  }
}

function normalizeAuthState(response, storedProfile = null) {
  if (
    response?.status !== 'authenticated' ||
    !response?.user?.id ||
    !response?.user?.email ||
    !response?.session?.accessToken
  ) {
    throw new Error('Sign-in did not return a usable session.')
  }

  const expiresAt =
    typeof response.session.expiresAt === 'number'
      ? response.session.expiresAt * 1000
      : null
  const defaultProfile = storedProfile || createDefaultProfile(response.user.email)
  const requestedWorkspace = defaultProfile.defaultWorkspace || 'individual'
  const permissions = {
    individual: response?.permissions?.individual ?? true,
    team: response?.permissions?.team ?? false,
    admin: response?.permissions?.admin ?? false,
  }

  return {
    user: {
      id: response.user.id,
      email: response.user.email,
    },
    session: {
      accessToken: response.session.accessToken,
      refreshToken: response.session.refreshToken,
      tokenType: response.session.tokenType,
      expiresAt,
    },
    permissions,
    profile: {
      ...createDefaultProfile(response.user.email),
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

function restoreStoredSession() {
  const storedSession = readJsonStorage(AUTH_STORAGE_KEY)
  const storedProfile = readJsonStorage(PROFILE_STORAGE_KEY)

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
      ...createDefaultProfile(storedSession.user?.email),
      ...(storedSession.profile || {}),
      ...(storedProfile || {}),
    },
  }
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    status: 'loading',
    sessionData: null,
  })

  useEffect(() => {
    const restoredSession = restoreStoredSession()

    setAuthState({
      status: 'ready',
      sessionData: restoredSession,
    })
  }, [])

  const signIn = useCallback(async (credentials) => {
    const response = await signInWithPassword(credentials)
    const nextSession = normalizeAuthState(response, readJsonStorage(PROFILE_STORAGE_KEY))

    writeJsonStorage(AUTH_STORAGE_KEY, nextSession)
    writeJsonStorage(PROFILE_STORAGE_KEY, nextSession.profile)

    setAuthState({
      status: 'ready',
      sessionData: nextSession,
    })

    return nextSession
  }, [])

  const signOut = useCallback(() => {
    removeStorageValue(AUTH_STORAGE_KEY)

    setAuthState((current) => ({
      status: current.status,
      sessionData: null,
    }))
  }, [])

  const updateProfile = useCallback((updates) => {
    setAuthState((current) => {
      if (!current.sessionData) {
        return current
      }

      const nextProfile = {
        ...current.sessionData.profile,
        ...updates,
      }
      const nextWorkspace =
        nextProfile.defaultWorkspace === 'team' && current.sessionData.permissions.team
          ? 'team'
          : 'individual'
      const nextSessionData = {
        ...current.sessionData,
        profile: nextProfile,
        workspaceContext: nextWorkspace,
      }

      writeJsonStorage(AUTH_STORAGE_KEY, nextSessionData)
      writeJsonStorage(PROFILE_STORAGE_KEY, nextProfile)

      return {
        ...current,
        sessionData: nextSessionData,
      }
    })
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
        profile: {
          ...current.sessionData.profile,
          defaultWorkspace: workspaceContext,
        },
      }

      writeJsonStorage(AUTH_STORAGE_KEY, nextSessionData)
      writeJsonStorage(PROFILE_STORAGE_KEY, nextSessionData.profile)

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
      removeStorageValue(AUTH_STORAGE_KEY)
    }

    return {
      isLoading: authState.status === 'loading',
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
