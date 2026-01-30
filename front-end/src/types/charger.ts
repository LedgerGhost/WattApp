export type ChargerType =
  | 'Type2'
  | 'AC_GB/T'
  | 'CCS'
  | 'CHAdeMO'
  | string

export type AvailabilityStatus =
  | 'Available'
  | 'Charging'
  | 'Reserved'
  | 'Offline'
  | 'Malfunction'

export type BackendStatus =
  | 'available'
  | 'charging'
  | 'reserved'
  | 'malfunction'
  | 'offline'

export interface BackendPoint {
  pointid: string
  lat: number
  lon: number
  status: BackendStatus
  cap: number
  kwhprice: number
}

export interface BackendPointInfo extends BackendPoint {
  station_name?: string
  connector_type?: string
  address?: string
  providerName?: string
}

export interface Charger {
  id: string
  name: string
  address: string
  price: number
  available: number
  distance: number
  latitude: number
  longitude: number
  chargerType: ChargerType
  status: AvailabilityStatus
  power: number // kW
}

export interface Point {
  pointid: string
  station_name?: string
  address?: string
  status: string
  cap: number
  kwhprice: number
  connector_type?: string
}
