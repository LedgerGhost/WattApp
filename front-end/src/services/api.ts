const API_BASE = 'http://localhost:9876/api'

export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken')
}

export const setAuthToken = (token: string) => {
  localStorage.setItem('authToken', token)
}

export const clearAuthToken = () => {
  localStorage.removeItem('authToken')
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>
}

export const apiCall = async (
  endpoint: string,
  options: FetchOptions = {}
) => {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let errorMessage = `API error ${res.status}`
    try {
      const errorData = await res.json()
      errorMessage = errorData.error || errorMessage
    } catch {
      // If response is not JSON, just use the status-based message
    }
    throw new Error(errorMessage)
  }

  return res.json()
}

// Auth endpoints
export const login = async (email: string, password: string) => {
  const data = await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (data.token) {
    setAuthToken(data.token)
  }
  return data
}

export const signup = async (
  fullName: string,
  email: string,
  password: string
) => {
  const data = await apiCall('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name: fullName,
      email,
      password,
    }),
  })
  if (data.token) {
    setAuthToken(data.token)
  }
  return data
}

export const logout = async () => {
  try {
    await apiCall('/auth/logout', { method: 'POST' })
  } finally {
    clearAuthToken()
  }
}

// Get current logged-in user
export const getCurrentUser = async () => {
  return apiCall('/auth/me')
}

// Points endpoints
export const getPoints = async () => {
  return apiCall('/points')
}

// Sessions endpoints
export const getSessions = async () => {
  return apiCall('/sessions')
}

// Point status endpoints
export const getPointStatus = async () => {
  return apiCall('/pointstatus')
}
