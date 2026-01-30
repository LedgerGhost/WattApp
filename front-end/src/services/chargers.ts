import { apiCall } from './api'

// Points endpoints
export const getPoints = async () => {
  return apiCall('/points')
}

export const getPointsInfo = async () => {
  return apiCall('/pointsinfo')
}

export const getPointStatus = async () => {
  return apiCall('/pointstatus')
}

// Reservations
export const getMyReservations = async () => {
  return apiCall('/myreservations')
}

export const reservePoint = async (pointId: string, minutes: number = 30) => {
  return apiCall(`/USERreserve/${pointId}/${minutes}`, {
    method: 'POST',
  })
}

export const cancelReservation = async (pointId: string) => {
  const data = {
    status: 'available',
  }

  return apiCall(`/updpoint/${pointId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Sessions
export const getSessions = async () => {
  return apiCall('/sessions')
}
