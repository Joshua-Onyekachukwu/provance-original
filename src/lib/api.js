const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/v1'

function getStoredAccessToken() {
  try {
    const raw = window.localStorage.getItem('provance.auth.session.v1')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.session?.accessToken || null
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  }
  const shouldSetJson =
    !(options.body instanceof FormData) && !('Content-Type' in headers)

  if (shouldSetJson) {
    headers['Content-Type'] = 'application/json'
  }

  const accessToken = getStoredAccessToken()
  if (accessToken && !('Authorization' in headers)) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...options,
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
