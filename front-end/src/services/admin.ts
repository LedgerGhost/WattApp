import { apiCall } from './api'

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

export const getAdminPoints = async () => {
  return apiCall('/points')
}

export const updatePoint = async (
  id: string,
  data: { status?: string; kwhprice?: number }
) => {
  return apiCall(`/updpoint/${id}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
