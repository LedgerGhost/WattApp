export interface Activity {
  id: number
  date: string
  type: 'charge' | 'reservation' | 'payment'
  value: number
  durationMin?: number
  status: 'completed' | 'pending' | 'cancelled' | 'expired' | 'active'
  location?: string
  chargerType?: string
  powerKw?: number
  endTime?: string
  lat?: number
  lon?: number
  pointId?: string
}

export type DatePreset = 'lastMonth' | 'last3Months' | 'currentYear' | 'all' | 'custom'
