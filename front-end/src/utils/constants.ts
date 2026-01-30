import type { BackendStatus, AvailabilityStatus } from '../types'

// Map configuration
export const DEFAULT_CENTER: [number, number] = [37.9838, 23.7275] // Athens, Greece
export const DEFAULT_ZOOM = 12
export const LOCATION_ZOOM = 15 // Zoom level gives approximately a 1km radius view

// Earth's radius in kilometers (for distance calculations)
export const EARTH_RADIUS_KM = 6371

// Status color mapping for map pins
export const STATUS_COLORS = {
  Available: '#22c55e',    // green
  Charging: '#3b82f6',     // blue
  Reserved: '#f59e0b',     // amber
  Offline: '#6b7280',      // gray
  Malfunction: '#ef4444',  // red
} as const

// Backend to frontend status mapping
export const mapStatus = (status: BackendStatus): AvailabilityStatus => {
  switch (status) {
    case 'available':
      return 'Available'
    case 'charging':
      return 'Charging'
    case 'reserved':
      return 'Reserved'
    case 'malfunction':
      return 'Malfunction'
    case 'offline':
      return 'Offline'
    default:
      return 'Offline'
  }
}

// Phone number default country code
export const DEFAULT_PHONE_PREFIX = '+30' // Greece
