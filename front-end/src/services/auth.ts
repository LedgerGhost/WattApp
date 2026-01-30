import {
  apiCall,
  setAuthToken,
  clearAuthToken,
  setUserData,
  getUserData,
} from './api'

// Guest mode functions
export const setGuestMode = () => {
  localStorage.setItem('guestMode', 'true')
}

export const clearGuestMode = () => {
  localStorage.removeItem('guestMode')
}

export const isGuest = (): boolean => {
  return localStorage.getItem('guestMode') === 'true'
}

// Authentication
export const login = async (email: string, password: string) => {
  const data = await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  if (!data.token) {
    throw new Error('Login failed: No session token received from server')
  }

  // Clear guest mode when logging in
  clearGuestMode()

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
  password: string,
  phone?: string
) => {
  const data = await apiCall('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      fullName,
      email,
      password,
      ...(phone && { phone }),
    }),
  })

  if (data.status !== 'OK') {
    throw new Error(data.message || 'Signup failed')
  }

  return data
}

export const logout = async () => {
  try {
    const token = localStorage.getItem('authToken')
    if (token) {
      const response = await apiCall('/auth/logout', {
        method: 'POST',
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

export const getCurrentUser = async () => {
  return apiCall('/auth/me')
}

// Role management
export const getUserRole = (): string | null => {
  const userData = getUserData()
  return userData?.role || null
}

export const isAdmin = (): boolean => {
  return getUserRole() === 'admin'
}
