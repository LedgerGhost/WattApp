import { apiCall } from './api'
import type { Station } from '../types'

export interface StationsResponse {
  cnt: number
  radius: number
  results: Station[]
}

export interface PointInfo {
  pointid: number
  lon: string
  lat: string
  status: string
  cap: number
  reservationendtime: string
  kwhprice: number
  station_name?: string
  connector_type?: string
}

// Get all stations grouped by location within radius
export const getStationsByLocation = async (lat: number, lon: number, radius?: number): Promise<StationsResponse> => {
  const path = radius
    ? `/pointsbystation/${lon}/${lat}/${radius}`
    : `/pointsbystation/${lon}/${lat}`
  return apiCall(path, {
    method: 'GET',
  })
}

// Get single charger/point info by ID
export const getPointById = async (pointId: number): Promise<PointInfo> => {
  return apiCall(`/point/${pointId}`, {
    method: 'GET',
  })
}

// Get multiple chargers by their IDs (fetches in parallel)
export const getPointsByIds = async (pointIds: number[]): Promise<PointInfo[]> => {
  const results = await Promise.all(
    pointIds.map(id => getPointById(id))
  )
  return results
}

// Get all points (for filtering data)
export const getAllPoints = async (): Promise<PointInfo[]> => {
  return apiCall('/points', {
    method: 'GET',
  })
}
