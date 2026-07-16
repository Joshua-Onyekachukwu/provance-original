const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/v1'
const AUTH_STORAGE_KEY = 'provance.auth.session.v1'

function readStoredSession() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeStoredSession(session) {
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Ignore storage write failures and let the current request continue.
  }
}

function clearStoredSession() {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // Ignore storage cleanup failures.
  }
}

async function refreshStoredSessionIfNeeded(force = false) {
  const storedSession = readStoredSession()
  const accessToken = storedSession?.session?.accessToken
  const refreshToken = storedSession?.session?.refreshToken
  const expiresAt = storedSession?.session?.expiresAt
  const refreshThresholdMs = 60 * 1000

  if (!refreshToken) {
    return accessToken || null
  }

  if (
    !force &&
    typeof expiresAt === 'number' &&
    expiresAt - Date.now() > refreshThresholdMs
  ) {
    return accessToken || null
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refreshToken,
    }),
  })

  if (!response.ok) {
    clearStoredSession()
    return null
  }

  const body = await response.json()
  const nextSession = {
    ...storedSession,
    user: body.user || storedSession?.user || null,
    permissions: body.permissions || storedSession?.permissions || null,
    session: {
      accessToken: body?.session?.accessToken || accessToken,
      refreshToken: body?.session?.refreshToken || refreshToken,
      tokenType: body?.session?.tokenType || storedSession?.session?.tokenType || 'bearer',
      expiresAt:
        typeof body?.session?.expiresAt === 'number'
          ? body.session.expiresAt * 1000
          : storedSession?.session?.expiresAt || null,
    },
  }

  writeStoredSession(nextSession)
  return nextSession.session.accessToken || null
}

async function request(path, options = {}) {
  const {
    skipAuthRefresh = false,
    retryOnUnauthorized = true,
    ...fetchOptions
  } = options
  const headers = {
    ...(fetchOptions.headers || {}),
  }
  const shouldSetJson =
    !(fetchOptions.body instanceof FormData) && !('Content-Type' in headers)

  if (shouldSetJson) {
    headers['Content-Type'] = 'application/json'
  }

  const accessToken =
    skipAuthRefresh === true
      ? readStoredSession()?.session?.accessToken || null
      : await refreshStoredSessionIfNeeded()

  if (accessToken && !('Authorization' in headers)) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...fetchOptions,
  })

  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'message' in body
        ? body.message
        : 'Request failed.'

    if (response.status === 401 && retryOnUnauthorized !== false) {
      const refreshedAccessToken = await refreshStoredSessionIfNeeded(true)

      if (refreshedAccessToken && refreshedAccessToken !== accessToken) {
        return request(path, {
          ...options,
          retryOnUnauthorized: false,
        })
      }
    }

    throw new Error(message)
  }

  return body
}

export function submitWaitlistApplication(form) {
  return request('/waitlist/applications', {
    method: 'POST',
    body: JSON.stringify({
      fullName: form.name,
      email: form.email,
      company: form.company,
      roleTitle: form.role,
      useCase: form.useCase,
    }),
  })
}

export function signInWithPassword(credentials) {
  return request('/auth/sign-in', {
    method: 'POST',
    body: JSON.stringify(credentials),
    skipAuthRefresh: true,
  })
}

export function requestPasswordReset(payload) {
  return request('/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuthRefresh: true,
  })
}

export function confirmPasswordReset(payload) {
  return request('/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuthRefresh: true,
  })
}

export function acceptInvite(payload) {
  return request('/auth/invites/accept', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuthRefresh: true,
  })
}

export function getCurrentViewer() {
  return request('/auth/me')
}

export function updateAccountProfile(payload) {
  return request('/account/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function initiateScan(payload) {
  return request('/scans', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function submitScan(scanId) {
  return request(`/scans/${scanId}/submit`, {
    method: 'POST',
  })
}

export function listScans() {
  return request('/scans')
}

export function getScan(scanId) {
  return request(`/scans/${scanId}`)
}

export function getAdminDashboard() {
  return request('/admin/dashboard')
}

export function reviewWaitlistApplication(applicationId, payload) {
  return request(`/admin/waitlist/${applicationId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function createAccessInvite(applicationId, payload = {}) {
  return request(`/admin/waitlist/${applicationId}/invite`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
