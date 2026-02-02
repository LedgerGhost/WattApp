import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import type { Charger } from '../../types'

// Use Leaflet from CDN (loaded globally in index.html)
declare const L: typeof import('leaflet')

export default function FitBoundsOnSelect({
  userLocation,
  selectedCharger
}: {
  userLocation: [number, number] | null
  selectedCharger: Charger | null
}) {
  const map = useMap()

  useEffect(() => {
    if (selectedCharger && userLocation) {
      const bounds = L.latLngBounds(
        [userLocation[0], userLocation[1]],
        [selectedCharger.latitude, selectedCharger.longitude]
      )
      map.fitBounds(bounds, { padding: [100, 100], maxZoom: 15 })
    }
  }, [selectedCharger, userLocation, map])

  return null
}