import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useNavigate, useLocation } from 'react-router-dom'
import './map.css'
import { getPointsInfo, getMyReservations, reservePoint, cancelReservation } from '../../services/chargers'
import { isGuest } from '../../services/auth'
import { getChargerImage } from '../../utils/chargerImages'
import { DEFAULT_CENTER, DEFAULT_ZOOM, LOCATION_ZOOM, EARTH_RADIUS_KM, mapStatus } from '../../utils/constants'
import type { Charger, ChargerType, AvailabilityStatus, BackendPointInfo } from '../../types'

// Use Leaflet from CDN (loaded globally in index.html)
declare const L: typeof import('leaflet')

// Charger type images are now handled in utils/chargerImages.ts











// Calculate distance between two coordinates using Haversine formula (returns km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = EARTH_RADIUS_KM // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Component to fit bounds when charger is selected
function FitBoundsOnSelect({
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

// Component to handle recenter button
function RecenterButton({
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

export default function Map() {
  console.log('✅ Map component mounted')

  const [chargers, setChargers] = useState<Charger[]>([])
  const [isLoadingChargers, setIsLoadingChargers] = useState(true)
  const [chargersError, setChargersError] = useState<string | null>(null)

  // User location state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [_locationError, setLocationError] = useState<string | null>(null)
  const [_isLoadingLocation, setIsLoadingLocation] = useState(true)

  const navigate = useNavigate()
  const location = useLocation()
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null)
  const [chargerTypeSearch, setChargerTypeSearch] = useState('')
  const [showChargerTypeSuggestions, setShowChargerTypeSuggestions] = useState(false)
  const [isLeftSidebarMinimized, setIsLeftSidebarMinimized] = useState(false)
  const [isFiltersMinimized, setIsFiltersMinimized] = useState(false)


  const [filters, setFilters] = useState({
    maxPrice: 1 as number,
    availabilityFilter: 'All' as 'All' | AvailabilityStatus,
    chargerTypeFilter: '' as string,
  })



  //reserve hooks
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [reserveMinutes, setReserveMinutes] = useState(30)
  const [reserveStatus, setReserveStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [reserveMessage, setReserveMessage] = useState('')
  const [cancelStatus, setCancelStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [cancelMessage, setCancelMessage] = useState('')

  // Active reservation state - persists until cancelled or expired
  const [activeReservation, setActiveReservation] = useState<{
    charger: Charger
    endTime: string
    minutes: number
  } | null>(null)



  useEffect(() => {
    const fetchChargers = async () => {
      try {
        setIsLoadingChargers(true)
        setChargersError(null)

        const raw = await getPointsInfo()

        console.log('RAW /pointsinfo response:', raw)

        // The backend might return either an array OR an object with an array inside.
        const points: BackendPointInfo[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw.points)
            ? raw.points
            : Array.isArray(raw.pointsinfo)
              ? raw.pointsinfo
              : []

        if (points.length === 0) {
          throw new Error('No points array found in response')
        }


        const mapped: Charger[] = points.map(p => ({
          id: p.pointid, // ✅ keep as string (recommended)
          name: p.station_name || p.providerName || 'Unknown Station',
          address: p.address || 'Unknown location',
          price: p.kwhprice ?? 0,
          available: p.status === 'available' ? 1 : 0,
          distance: 0,
          latitude: p.lat,
          longitude: p.lon,
          chargerType: (p.connector_type as ChargerType),
          status: mapStatus(p.status),
          power: p.cap ?? 0,
        }))

        setChargers(mapped)

        // Check if we navigated here with a specific point to show
        const state = location.state as { pointId?: string; lat?: number; lon?: number } | null
        if (state?.pointId) {
          const targetCharger = mapped.find(c => c.id === state.pointId)
          if (targetCharger) {
            setSelectedCharger(targetCharger)
          }
          // Clear the state after using it
          navigate(location.pathname, { replace: true, state: {} })
        }
      } catch (err) {
        setChargersError('Could not load charging points')
      } finally {
        setIsLoadingChargers(false)
      }
    }

    fetchChargers()
  }, [])

  // Check for active reservations on load
  useEffect(() => {
    const checkActiveReservation = async () => {
      // Don't check if user is a guest or chargers haven't loaded yet
      if (isGuest() || isLoadingChargers || chargers.length === 0) return

      try {
        const reservations = await getMyReservations()

        // API returns 204 (null) if no reservations
        if (!reservations || !Array.isArray(reservations)) return

        // Find active reservation
        const active = reservations.find((r: any) => r.status === 'active')
        if (!active) return

        // Find matching charger from loaded chargers
        const matchingCharger = chargers.find(c => c.id === active.pointid)

        // Build charger object from reservation data (fallback if not found in chargers)
        const chargerData: Charger = matchingCharger || {
          id: active.pointid,
          name: active.station_name || 'Unknown Station',
          address: active.address || 'Unknown location',
          price: 0,
          available: 0,
          distance: 0,
          latitude: 0,
          longitude: 0,
          chargerType: active.connector_type || 'Unknown',
          status: 'Reserved' as AvailabilityStatus,
          power: active.power_kw || 0,
        }

        setActiveReservation({
          charger: chargerData,
          endTime: active.end_time,
          minutes: active.duration_minutes,
        })
      } catch (err) {
        console.warn('Failed to check active reservations:', err)
      }
    }

    checkActiveReservation()
  }, [isLoadingChargers, chargers])

  // Get user's location from browser
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setIsLoadingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation([latitude, longitude])
        setIsLoadingLocation(false)
        console.log('📍 User location:', latitude, longitude)
      },
      (error) => {
        console.warn('Geolocation error:', error.message)
        setLocationError(error.message)
        setIsLoadingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache location for 5 minutes
      }
    )
  }, [])


  if (isLoadingChargers) {
    return <div className="map-container">Loading chargers…</div>
  }

  if (chargersError) {
    return <div className="map-container">{chargersError}</div>
  }



  // =========================
  // HELPERS
  // =========================

  // Helper for map pin color based on status

  const getMapPinColor = (status: AvailabilityStatus): string => {
    switch (status) {
      case 'Available':
        return 'green'
      case 'Charging':
        return 'red'
      case 'Offline':
        return 'grey'
      case 'Malfunction':
        return 'orange'
      default:
        return 'blue'
    }
  }

  // =========================
  // RESERVE HANDLERS
  // =========================
  const openReserveModal = () => {
    if (!selectedCharger) return

    // Check if user is a guest
    if (isGuest()) {
      setShowGuestModal(true)
      return
    }

    setReserveMinutes(30)
    setReserveStatus('idle')
    setReserveMessage('')
    setShowReserveModal(true)
  }

  const closeReserveModal = () => {
    setShowReserveModal(false)
  }

  const confirmReservation = async () => {
    if (!selectedCharger) return

    const minutes = Math.max(1, Math.min(60, reserveMinutes))

    try {
      setReserveStatus('loading')
      setReserveMessage('')

      const data = await reservePoint(selectedCharger.id, minutes)
      console.log('Reserve response:', data)

      // Check if reservation was unsuccessful (point not available)
      if (data.reservationendtime === '1970-01-01 00:00') {
        setReserveStatus('error')
        setReserveMessage('Point is not available for reservation.')
        return
      }

      // Store active reservation and close modal
      setActiveReservation({
        charger: selectedCharger,
        endTime: data.reservationendtime,
        minutes: minutes
      })
      setShowReserveModal(false)
      setReserveStatus('idle')
      setReserveMessage('')
    } catch (e: any) {
      setReserveStatus('error')
      const errorMsg = e?.message || 'Unexpected error. Please try again.'
      if (errorMsg.includes('401') || errorMsg.toLowerCase().includes('auth')) {
        setReserveMessage('You must be logged in to reserve a spot. Please log in again.')
      } else if (errorMsg.includes('404')) {
        setReserveMessage('Point not found.')
      } else if (errorMsg.includes('active reservation') || errorMsg.includes('409')) {
        setReserveMessage('You already have an active reservation.')
      } else {
        setReserveMessage(errorMsg)
      }
    }
  }

  const handleCancelReservation = async () => {
    if (!activeReservation) return

    try {
      setCancelStatus('loading')
      setCancelMessage('')

      await cancelReservation(activeReservation.charger.id)

      setCancelStatus('idle')
      setCancelMessage('')
      setActiveReservation(null)
      // Refresh chargers to update statuses
      window.location.reload()
    } catch (e: any) {
      setCancelStatus('error')
      const errorMsg = e?.message || 'Failed to cancel reservation.'
      if (errorMsg.includes('404') || errorMsg.toLowerCase().includes('not found')) {
        setCancelMessage('No active reservation found.')
        setActiveReservation(null)
      } else {
        setCancelMessage(errorMsg)
      }
    }
  }

  // Handle closing the success modal
  const closeSuccessModal = () => {
    setShowReserveModal(false)
    setReserveStatus('idle')
    setReserveMessage('')
    // Optionally refresh chargers to update status
    window.location.reload()
  }

  // Get unique charger types from all chargers
  const uniqueChargerTypes = Array.from(
    new Set(chargers.map(c => c.chargerType).filter(Boolean))
  ).sort()

  // Filter suggestions based on search input
  const chargerTypeSuggestions = uniqueChargerTypes.filter(type =>
    type.toLowerCase().includes(chargerTypeSearch.toLowerCase())
  )

  // Calculate distances and sort by proximity
  const chargersWithDistance = chargers.map(charger => {
    if (userLocation) {
      const distance = calculateDistance(
        userLocation[0],
        userLocation[1],
        charger.latitude,
        charger.longitude
      )
      return { ...charger, distance: parseFloat(distance.toFixed(1)) }
    }
    return charger
  })

  const filteredChargers = chargersWithDistance
    .filter(charger => {
      const priceMatch = charger.price <= filters.maxPrice

      const availabilityMatch =
        filters.availabilityFilter === 'All' ||
        charger.status === filters.availabilityFilter

      const chargerTypeMatch =
        !filters.chargerTypeFilter ||
        charger.chargerType === filters.chargerTypeFilter

      return priceMatch && availabilityMatch && chargerTypeMatch
    })
    .sort((a, b) => a.distance - b.distance)

  // =========================
  // RENDER
  // =========================
  return (
    <div className="map-container">
      {/* Left Sidebar */}
      <div className={`sidebar sidebar-left ${isLeftSidebarMinimized ? 'minimized' : ''}`}>
        <div className="sidebar-header">
          <div className="header-top">
            <h2>⚡ WattApp</h2>
            <button
              type="button"
              className="minimize-btn"
              onClick={() => setIsLeftSidebarMinimized(!isLeftSidebarMinimized)}
              title={isLeftSidebarMinimized ? 'Expand filters' : 'Minimize filters'}
            >
              {isLeftSidebarMinimized ? '▶' : '◀'}
            </button>
          </div>

          <button
            type="button"
            className="profile-btn"
            onClick={() => {
              if (isGuest()) {
                setShowGuestModal(true)
              } else {
                navigate('/profile')
              }
            }}
          >
            Profile
          </button>
        </div>

        {/* Filters */}
        <div className={`filters ${isFiltersMinimized ? 'minimized' : ''}`}>
          <div className="filter-group">
            <label>Max Price ($/kWh)</label>
            <div className="price-range">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={filters.maxPrice}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    maxPrice: parseFloat(e.target.value),
                  }))
                }
              />
              <div className="price-display">
                ${filters.maxPrice.toFixed(2)}/kWh
              </div>
            </div>
          </div>

          <div className="filter-group">
            <label>Availability Status</label>
            <div className="availability-filter">
              {(['All', 'Available', 'Charging', 'Reserved', 'Offline', 'Malfunction'] as const).map(
                status => (
                  <label key={status} className="checkbox-label">
                    <input
                      type="radio"
                      name="availability"
                      value={status}
                      checked={filters.availabilityFilter === status}
                      onChange={e =>
                        setFilters(prev => ({
                          ...prev,
                          availabilityFilter: e.target.value as any,
                        }))
                      }
                    />
                    <span>{status}</span>
                  </label>
                )
              )}
            </div>
          </div>

          <div className="filter-group">
            <label>Charger Type</label>
            <div className="charger-type-search-container">
              <input
                type="text"
                placeholder="Search charger type..."
                value={chargerTypeSearch}
                onChange={e => {
                  setChargerTypeSearch(e.target.value)
                  setShowChargerTypeSuggestions(true)
                }}
                onFocus={() => setShowChargerTypeSuggestions(true)}
                className="charger-type-search-input"
              />
              {filters.chargerTypeFilter && (
                <button
                  className="clear-search-btn"
                  onClick={() => {
                    setChargerTypeSearch('')
                    setFilters(prev => ({
                      ...prev,
                      chargerTypeFilter: '',
                    }))
                  }}
                >
                  ✕
                </button>
              )}
              {showChargerTypeSuggestions && chargerTypeSearch && (
                <div className="charger-type-suggestions">
                  {chargerTypeSuggestions.length > 0 ? (
                    chargerTypeSuggestions.map(type => (
                      <div
                        key={type}
                        className="suggestion-item"
                        onClick={() => {
                          setChargerTypeSearch(type)
                          setFilters(prev => ({
                            ...prev,
                            chargerTypeFilter: type,
                          }))
                          setShowChargerTypeSuggestions(false)
                        }}
                      >
                        {type}
                      </div>
                    ))
                  ) : (
                    <div className="suggestion-item no-results">No matches found</div>
                  )}
                </div>
              )}
              {filters.chargerTypeFilter && (
                <div className="selected-filter">
                  Selected: <strong>{filters.chargerTypeFilter}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          className="toggle-filters-btn"
          onClick={() => setIsFiltersMinimized(!isFiltersMinimized)}
          title={isFiltersMinimized ? 'Show filters' : 'Hide filters'}
        >
          {isFiltersMinimized ? '▼ Show Filters' : '▲ Hide Filters'}
        </button>

        {/* Chargers list */}
        <div className="chargers-list">
          {filteredChargers.map(charger => (
            <div
              key={charger.id}
              className={`charger-card ${selectedCharger?.id === charger.id ? 'active' : ''}`}
              onClick={() => setSelectedCharger(charger)}
            >
              <div className="charger-name">{charger.name}</div>
              <div className="charger-info">
                <span className="price">${charger.price.toFixed(2)}/kWh</span>
                <span className="distance">{charger.distance} km</span>
              </div>
              <div className="charger-specs">
                <span className="type">{charger.chargerType}</span>
                <span className="power">{charger.power}kW</span>
              </div>
              <div className="charger-status">
                <span className={`status ${charger.status.toLowerCase()}`}>{charger.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map area */}
      <div className="map-area">
        <MapContainer
          center={userLocation || DEFAULT_CENTER}
          zoom={userLocation ? LOCATION_ZOOM : DEFAULT_ZOOM}
          scrollWheelZoom={true}
          className="leaflet-container"
        >
          {/* Fit bounds to show both user and selected charger */}
          <FitBoundsOnSelect
            userLocation={userLocation}
            selectedCharger={selectedCharger}
          />

          {/* Recenter button */}
          <RecenterButton
            userLocation={userLocation}
            onRecenter={() => setSelectedCharger(null)}
          />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* User location marker */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={L.divIcon({
                className: 'user-location-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
                popupAnchor: [0, -10],
              })}
            >
              <Popup>
                <div className="popup-content">
                  <h4>📍 Your Location</h4>
                </div>
              </Popup>
            </Marker>
          )}

          {filteredChargers.map(charger => {
            const isSelected = selectedCharger?.id === charger.id
            return (
              <Marker
                key={charger.id}
                position={[charger.latitude, charger.longitude]}
                icon={L.icon({
                  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${getMapPinColor(
                    charger.status
                  )}.png`,
                  // shadowUrl:
                  //   'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                  iconSize: isSelected ? [35, 57] : [25, 41],
                  iconAnchor: isSelected ? [17, 57] : [12, 41],
                  popupAnchor: [1, -34],
                  // shadowSize: [41, 41],
                  className: isSelected ? 'selected-marker' : '',
                })}
                eventHandlers={{
                  click: () => setSelectedCharger(charger),
                }}
              >
                <Popup>
                  <div className="popup-content">
                    <h4>{charger.name}</h4>
                    <p>{charger.address}</p>
                    <p>
                      <strong>${charger.price.toFixed(2)}</strong>/kWh
                    </p>

                    <a
                      href={`https://www.google.com/maps?q=${charger.latitude},${charger.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="gmaps-link"
                    >
                      See location ↗
                    </a>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

        {/* Selected charger panel */}
        {selectedCharger && (
          <>
            <div className="selected-charger-info">
              <div className="charger-icon-header">
                <img
                  src={getChargerImage(selectedCharger.chargerType)}
                  alt={selectedCharger.chargerType || 'Charger'}
                  className="charger-type-icon"
                />
              </div>

              <h4>{selectedCharger.name}</h4>
              <p>{selectedCharger.address}</p>

              <div className="charger-details">
                <div className="detail-item">
                  <span className="label">Type:</span>
                  <span className="value">{selectedCharger.chargerType}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Power:</span>
                  <span className="value">{selectedCharger.power} kW</span>
                </div>
                <div className="detail-item">
                  <span className="label">Price:</span>
                  <span className="value">${selectedCharger.price.toFixed(2)}/kWh</span>
                </div>
                <div className="detail-item">
                  <span className="label">Status:</span>
                  <span className={`value status ${selectedCharger.status.toLowerCase()}`}>
                    {selectedCharger.status}
                  </span>
                </div>
              </div>

              <button
                className="reserve-btn"
                onClick={openReserveModal}
                disabled={selectedCharger.status !== 'Available'}
                title={selectedCharger.status !== 'Available' ? 'Can only reserve available chargers' : 'Reserve this charger'}
              >
                Reserve Spot
              </button>
            </div>
          </>
        )}

        {/* Guest Warning Modal */}
        {showGuestModal && (
          <div className="modal-overlay" onClick={() => setShowGuestModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Account Required</h3>
                <button className="modal-close" onClick={() => setShowGuestModal(false)}>
                  ✕
                </button>
              </div>
              <div className="modal-body success-body">
                <div
                  className="success-icon"
                  style={{
                    background: 'linear-gradient(135deg, #f6ad55 0%, #ed8936 100%)',
                    boxShadow: '0 8px 24px rgba(237, 137, 54, 0.35)'
                  }}
                >
                  🔒
                </div>
                <div className="success-message" style={{ color: '#c05621' }}>Login Required</div>
                <p className="success-sub">You need to log in to access this feature.</p>
              </div>
              <div className="modal-footer">
                <button
                  className="modal-btn secondary"
                  onClick={() => setShowGuestModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="modal-btn primary"
                  onClick={() => navigate('/login')}
                  style={{ background: 'linear-gradient(135deg, #f6ad55 0%, #ed8936 100%)' }}
                >
                  Go to Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Reservation Overlay - persistent until cancelled */}
        {activeReservation && (
          <div className="active-reservation-overlay">
            <div className="reservation-header">
              <span className="reservation-badge">Active Reservation</span>
            </div>
            <div className="reservation-charger-info">
              <img
                src={getChargerImage(activeReservation.charger.chargerType)}
                alt={activeReservation.charger.chargerType || 'Charger'}
                className="charger-type-icon-small"
              />
              <div className="reservation-details">
                <h4>{activeReservation.charger.name}</h4>
                <p>{activeReservation.charger.address}</p>
                <div className="reservation-specs">
                  <span>{activeReservation.charger.chargerType}</span>
                  <span>{activeReservation.charger.power} kW</span>
                  <span>${activeReservation.charger.price.toFixed(2)}/kWh</span>
                </div>
                <div className="reservation-time">
                  <span className="time-label">Reserved until:</span>
                  <span className="time-value">{activeReservation.endTime}</span>
                </div>
              </div>
            </div>
            {cancelStatus === 'error' && (
              <div className="reservation-error">{cancelMessage}</div>
            )}
            <button
              className="cancel-reservation-btn"
              onClick={handleCancelReservation}
              disabled={cancelStatus === 'loading'}
            >
              {cancelStatus === 'loading' ? 'Cancelling...' : 'Cancel Reservation'}
            </button>
          </div>
        )}

        {/* Reserve modal */}
        {showReserveModal && selectedCharger && (
          <div className="modal-overlay" onClick={closeReserveModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              {reserveStatus === 'success' ? (
                /* Success confirmation screen */
                <>
                  <div className="modal-header">
                    <h3>Reservation Confirmed</h3>
                    <button className="modal-close" onClick={closeSuccessModal}>
                      ✕
                    </button>
                  </div>
                  <div className="modal-body success-body">
                    {cancelStatus === 'success' ? (
                      <>
                        <div className="success-icon" style={{ background: 'linear-gradient(135deg, #f6ad55 0%, #ed8936 100%)' }}>✓</div>
                        <div className="success-message" style={{ color: '#c05621' }}>
                          {cancelMessage}
                        </div>
                        <p className="success-sub">Your reservation has been cancelled.</p>
                      </>
                    ) : (
                      <>
                        <div className="success-icon">✓</div>
                        <div className="success-message">
                          {reserveMessage}
                        </div>
                        <p className="success-sub">Your spot has been reserved at {selectedCharger.name}</p>
                        {cancelStatus === 'error' && (
                          <div className="modal-alert error" style={{ marginTop: '1rem' }}>{cancelMessage}</div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="modal-footer">
                    {cancelStatus !== 'success' && (
                      <button
                        className="modal-btn secondary"
                        onClick={handleCancelReservation}
                        disabled={cancelStatus === 'loading'}
                        style={{ marginRight: 'auto' }}
                      >
                        {cancelStatus === 'loading' ? 'Cancelling...' : 'Cancel Reservation'}
                      </button>
                    )}
                    <button
                      className="modal-btn primary"
                      onClick={closeSuccessModal}
                    >
                      Close Window
                    </button>
                  </div>
                </>
              ) : (
                /* Normal reservation form */
                <>
                  <div className="modal-header">
                    <h3>Reserve: {selectedCharger.name}</h3>
                    <button className="modal-close" onClick={closeReserveModal}>
                      ✕
                    </button>
                  </div>

                  <div className="modal-body">
                    <label className="modal-label">Duration (minutes)</label>

                    <div className="modal-row">
                      <input
                        type="range"
                        min={1}
                        max={60}
                        value={reserveMinutes}
                        onChange={e => setReserveMinutes(parseInt(e.target.value, 10))}
                      />
                      <span className="minutes-pill">{reserveMinutes} min</span>
                    </div>

                    {reserveMessage && (
                      <div className={`modal-alert ${reserveStatus}`}>{reserveMessage}</div>
                    )}
                  </div>

                  <div className="modal-footer">
                    <button
                      className="modal-btn secondary"
                      onClick={closeReserveModal}
                      disabled={reserveStatus === 'loading'}
                    >
                      Cancel
                    </button>

                    <button
                      className="modal-btn primary"
                      onClick={confirmReservation}
                      disabled={reserveStatus === 'loading'}
                    >
                      {reserveStatus === 'loading' ? 'Reserving...' : 'Confirm Reservation'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
