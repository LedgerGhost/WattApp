import { useMap } from 'react-leaflet'
import { LOCATION_ZOOM } from '../../utils'
import './recenterbutton.css'

export default function RecenterButton({
  userLocation,
  onRecenter
}: {
  userLocation: [number, number] | null
  onRecenter: () => void
}) {
  const map = useMap()

  const handleRecenter = () => {
    if (userLocation) {
      map.setView(userLocation, LOCATION_ZOOM, { animate: true })
      onRecenter()
    }
  }

  if (!userLocation) return null

  return (
    <button
      className="recenter-button"
      onClick={handleRecenter}
      title="Center map on my location"
    >
      📍
    </button>
  )
}
