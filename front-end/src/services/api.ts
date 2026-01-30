const API_BASE = '/api'

// Token management
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken')
}

export const setAuthToken = (token: string) => {
  localStorage.setItem('authToken', token)
}

export const clearAuthToken = () => {
  localStorage.removeItem('authToken')
}

// User data management
export const getUserData = (): any => {
  const userData = localStorage.getItem('userData')
  return userData ? JSON.parse(userData) : null
}

export const setUserData = (data: any) => {
  localStorage.setItem('userData', JSON.stringify(data))
}

export const clearUserData = () => {
  localStorage.removeItem('userData')
}

// Base API call function
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
    headers['X-OBSERVATORY-AUTH'] = token
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  // 204 No Content: successful but nothing to parse
  if (res.status === 204) {
    return null
  }

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
