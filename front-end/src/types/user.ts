export interface User {
  _id?: string
  first_name?: string
  last_name?: string
  email?: string
  created_at?: string
  role?: string
}

export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  agreeTerms: boolean
}

export interface FormErrors {
  fullName?: string
  email?: string
  password?: string
  confirmPassword?: string
  agreeTerms?: string
}
