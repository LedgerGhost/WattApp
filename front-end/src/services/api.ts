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

export const login = async (email: string, password: string) => {
  const data = await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  
  if (!data.token) {
    throw new Error('Login failed: No session token received from server')
  }
  
  setAuthToken(data.token)
  setUserData({
    token: data.token,
    email: data.email || email,
    userId: data.userId,
    role: data.role,
    ...data,
  })
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
  
  if (!data.token) {
    throw new Error('Signup failed: No session token received from server')
  }
  
  setAuthToken(data.token)
  setUserData({
    token: data.token,
    email: data.email || email,
    userId: data.userId,
    fullName: fullName,
    role: data.role,
    ...data,
  })
  return data
}

export const logout = async () => {
  try {
    const token = getAuthToken()
    if (token) {
      const response = await apiCall('/auth/logout', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      console.log('✅ Logout successful:', response.message)
    }
  } catch (err) {
    console.error('❌ Logout error:', err)
  } finally {
    clearAuthToken()
    console.log('✅ Local auth data cleared')
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

export const getPointsInfo = async () => {
  return apiCall('/pointsinfo')
}

// Sessions endpoints
export const getSessions = async () => {
  return apiCall('/sessions')
}

// Point status endpoints
export const getPointStatus = async () => {
  return apiCall('/pointstatus')
}


// logout endpoint
export const performLogout = async () => {
  return apiCall('/auth/logout', { method: 'POST' })
}

//admin endpoints
//admin me vasi to swagger
export const getAdmin = async () => {
  return apiCall('/admin')
}

export const getHealthCheck = async () => {
  return apiCall('/admin/healthcheck')
}

export const resetpoints = async () => {
  return apiCall('/admin/resetpoints', { method: 'POST' })
}

export const addpoints = async () => {
  return apiCall('/admin/addpoints', { method: 'POST' })
}


