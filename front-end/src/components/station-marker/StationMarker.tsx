import { useState, useMemo, useRef, useEffect } from 'react'
import { Marker, Popup } from 'react-leaflet'
import type { Station, BackendStatus, Charger } from '../../types'
import type { PointInfo } from '../../services/station'
import { getPointsByIds } from '../../services/station'
import { reservePoint } from '../../services/chargers'
import { isGuest } from '../../services/auth'
import { mapStatus } from '../../utils/constants'
import ReserveModal from '../modals/ReserveModal'
import './StationMarker.css'


// Use Leaflet from CDN
declare const L: typeof import('leaflet')

// Icon cache - created lazily when first needed
let iconCache: Record<string, L.Icon> | null = null

const getIcon = (color: string) => {
  if (!iconCache) {
    iconCache = {
      blue: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      }),
      green: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      }),
      red: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      }),
    }
  }
  return iconCache[color] || iconCache.blue
}

export interface ReservationSuccessData {
  pointId: number
  endTime: string
  stationName: string
  connectorType: string
  power: number
  price: number
  minutes: number
}

interface StationMarkerProps {
  station: Station
  isSelected: boolean
  onGuestWarning: () => void
  onReservationSuccess: (data: ReservationSuccessData) => void
  refreshTrigger?: number
  chargerTypeFilter?: string
  statusFilter?: string
  pointConnectorTypes?: Record<number, string>
}

export default function StationMarker({
  station,
  isSelected,
  onGuestWarning,
  onReservationSuccess,
  refreshTrigger,
  chargerTypeFilter = '',
  statusFilter = '',
  pointConnectorTypes = {},
}: StationMarkerProps) {
  const markerRef = useRef<L.Marker>(null)
  const [chargers, setChargers] = useState<PointInfo[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reserve modal state
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [selectedCharger, setSelectedCharger] = useState<PointInfo | null>(null)
  const [reserveMinutes, setReserveMinutes] = useState(15)
  const [reserveStatus, setReserveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [reserveMessage, setReserveMessage] = useState('')

  // Open popup when selected from sidebar
  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup()
    }
  }, [isSelected])

  // Refresh chargers when refreshTrigger changes (e.g., after cancelling reservation)
  useEffect(() => {
    if (refreshTrigger && chargers) {
      const refreshChargers = async () => {
        try {
          const points = await getPointsByIds(station.points)
          // Merge connector types from the pre-fetched data
          const pointsWithTypes = points.map(p => ({
            ...p,
            connector_type: p.connector_type || pointConnectorTypes[p.pointid]
          }))
          setChargers(pointsWithTypes)
        } catch (err) {
          console.error('Error refreshing chargers:', err)
        }
      }
      refreshChargers()
    }
  }, [refreshTrigger, pointConnectorTypes])

  const handlePopupOpen = async () => {
    // Already loaded from a previous fetch
    if (chargers) return

    setIsLoading(true)
    setError(null)

    try {
      const points = await getPointsByIds(station.points)
      // Merge connector types from the pre-fetched data
      const pointsWithTypes = points.map(p => ({
        ...p,
        connector_type: p.connector_type || pointConnectorTypes[p.pointid]
      }))
      setChargers(pointsWithTypes)
    } catch (err) {
      setError('Failed to load chargers')
      console.error('Error loading chargers:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReserveClick = (charger: PointInfo) => {
    if (isGuest()) {
      onGuestWarning()
      return
    }

    setSelectedCharger(charger)
    setReserveMinutes(15)
    setReserveStatus('idle')
    setReserveMessage('')
    setShowReserveModal(true)
  }

  const handleReserveConfirm = async () => {
    if (!selectedCharger) return

    setReserveStatus('loading')
    setReserveMessage('')

    try {
      const data = await reservePoint(String(selectedCharger.pointid), reserveMinutes)

      if (data.reservationendtime === '1970-01-01 00:00') {
        setReserveStatus('error')
        setReserveMessage('Point is not available for reservation.')
        return
      }

      setReserveStatus('success')
      setReserveMessage(`Reserved for ${reserveMinutes} minutes!`)
      onReservationSuccess({
        pointId: selectedCharger.pointid,
        endTime: data.reservationendtime,
        stationName: station.station_name,
        connectorType: selectedCharger.connector_type || 'Unknown',
        power: selectedCharger.cap ?? 0,
        price: selectedCharger.kwhprice ?? 0,
        minutes: reserveMinutes,
      })

      // Refresh chargers to show updated status
      const points = await getPointsByIds(station.points)
      const pointsWithTypes = points.map(p => ({
        ...p,
        connector_type: p.connector_type || pointConnectorTypes[p.pointid]
      }))
      setChargers(pointsWithTypes)
    } catch (e: any) {
      setReserveStatus('error')
      const errorMsg = e?.message || 'Failed to reserve.'
      if (errorMsg.includes('409') || errorMsg.includes('active reservation')) {
        setReserveMessage('You already have an active reservation.')
      } else {
        setReserveMessage(errorMsg)
      }
    }
  }

  const handleCloseModal = () => {
    setShowReserveModal(false)
    setSelectedCharger(null)
    setReserveStatus('idle')
    setReserveMessage('')
  }

  const getStatusColor = (status: string): string => {
    const mappedStatus = mapStatus(status as BackendStatus)
    switch (mappedStatus) {
      case 'Available':
        return '#22c55e'
      case 'Charging':
        return '#ef4444'
      case 'Reserved':
        return '#f59e0b'
      case 'Offline':
        return '#6b7280'
      case 'Malfunction':
        return '#f97316'
      default:
        return '#3b82f6'
    }
  }

  // Memoize icon to prevent unnecessary re-renders
  const markerIcon = useMemo(() => {
    if (isSelected) {
      return getIcon('green')
    }
    return getIcon('blue')
  }, [isSelected])

  // Memoize position to prevent unnecessary re-renders
  const position = useMemo(
    () => [station.coordinates.lat, station.coordinates.lon] as [number, number],
    [station.coordinates.lat, station.coordinates.lon]
  )

  // Filter chargers based on type and status
  const filteredChargers = useMemo(() => {
    if (!chargers) return null

    return chargers.filter(charger => {
      // Filter by charger type (exact match)
      const matchesType = !chargerTypeFilter || charger.connector_type === chargerTypeFilter

      // Filter by status
      const matchesStatus = !statusFilter || charger.status === statusFilter

      return matchesType && matchesStatus
    })
  }, [chargers, chargerTypeFilter, statusFilter])

  // Create a charger object for the modal
  const modalCharger: Charger | null = selectedCharger ? {
    id: String(selectedCharger.pointid),
    name: station.station_name,
    address: '',
    price: selectedCharger.kwhprice ?? 0,
    available: selectedCharger.status === 'available' ? 1 : 0,
    distance: station.dist_from_user ?? 0,
    latitude: parseFloat(selectedCharger.lat),
    longitude: parseFloat(selectedCharger.lon),
    chargerType: selectedCharger.connector_type || 'Unknown',
    status: 'Available',
    power: selectedCharger.cap ?? 0,
  } : null

  return (
    <>
      {showReserveModal && modalCharger && (
        <ReserveModal
          charger={modalCharger}
          reserveMinutes={reserveMinutes}
          onMinutesChange={setReserveMinutes}
          onConfirm={handleReserveConfirm}
          onClose={handleCloseModal}
          reserveStatus={reserveStatus}
          reserveMessage={reserveMessage}
        />
      )}
      <Marker
        ref={markerRef}
        position={position}
        icon={markerIcon}
        eventHandlers={{
          popupopen: handlePopupOpen,
        }}
      >
        <Popup className="station-popup" minWidth={300} maxWidth={350}>
          <div className="station-popup-content">
          <h3 className="station-name">{station.station_name}</h3>
          {station.dist_from_user != null && (
            <p className="station-distance">
              {station.dist_from_user.toFixed(1)} km away
            </p>
          )}

          <div className="chargers-section">
            <h4>
              Chargers
              {filteredChargers && chargers && (
                <span className="charger-count">
                  {filteredChargers.length === chargers.length
                    ? ` (${chargers.length})`
                    : ` (${filteredChargers.length} of ${chargers.length})`}
                </span>
              )}
              {!chargers && ` (${station.points.length})`}
            </h4>

            {isLoading && (
              <div className="loading-chargers">Loading chargers...</div>
            )}

            {error && <div className="chargers-error">{error}</div>}

            {filteredChargers && filteredChargers.length === 0 && (
              <div className="no-chargers-match">No chargers match your filters</div>
            )}

            {filteredChargers && filteredChargers.length > 0 && (
              <div className="chargers-popup-list">
                {filteredChargers.map(charger => (
                  <div key={charger.pointid} className="charger-popup-item">
                    <div className="charger-type-badge">
                      {charger.connector_type || 'Unknown Type'}
                    </div>

                    <div className="charger-popup-header">
                      <span
                        className="charger-status-dot"
                        style={{ backgroundColor: getStatusColor(charger.status) }}
                      />
                      <span className={`status-badge status-${charger.status}`}>
                        {mapStatus(charger.status as BackendStatus)}
                      </span>
                    </div>

                    <div className="charger-popup-details">
                      <span className="charger-power">{charger.cap} kW</span>
                      <span className="charger-price">
                        ${charger.kwhprice?.toFixed(2) || '0.00'}/kWh
                      </span>
                    </div>

                    <button
                      className="charger-reserve-btn"
                      onClick={() => handleReserveClick(charger)}
                      disabled={charger.status !== 'available'}
                    >
                      {charger.status === 'available' ? 'Reserve' : 'Unavailable'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <a
            href={`https://www.google.com/maps?q=${station.coordinates.lat},${station.coordinates.lon}`}
            target="_blank"
            rel="noreferrer"
            className="gmaps-link"
          >
            See location ↗
          </a>
        </div>
      </Popup>
    </Marker>
    </>
  )
}
