import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet'
import { useNavigate, useLocation } from 'react-router-dom'
import './map.css'
import { getMyReservations, cancelReservation } from '../../services/chargers'
import { getStationsByLocation, getAllPointsInfo } from '../../services/station'
import type { PointInfo } from '../../services/station'
import { isGuest } from '../../services/auth'
import { DEFAULT_CENTER, DEFAULT_ZOOM, LOCATION_ZOOM } from '../../utils/constants'
import type { Station, Charger, AvailabilityStatus } from '../../types'
import {
  GuestWarningModal,
  ActiveReservationOverlay,
  RecenterButton,
  SidebarHeader,
  StationMarker,
  StationsList,
  StationFilters
} from '../../components'

// Use Leaflet from CDN (loaded globally in index.html)
declare const L: typeof import('leaflet')

// Component to fix gray tiles by invalidating map size
function MapResizer({ sidebarMinimized }: { sidebarMinimized?: boolean }) {
  const map = useMap()

  useEffect(() => {
    // Invalidate size multiple times to ensure tiles load
    const timers = [100, 300, 500, 1000].map(delay =>
      setTimeout(() => map.invalidateSize(), delay)
    )

    // Also invalidate on window resize
    const handleResize = () => map.invalidateSize()
    window.addEventListener('resize', handleResize)

    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('resize', handleResize)
    }
  }, [map])

  // Invalidate map size when sidebar is minimized/expanded
  useEffect(() => {
    // Small delay to let CSS transition complete
    const timer = setTimeout(() => map.invalidateSize(), 350)
    return () => clearTimeout(timer)
  }, [map, sidebarMinimized])

  return null
}

// Component to fly to selected station
function FlyToStation({ station }: { station: Station | null }) {
  const map = useMap()

  useEffect(() => {
    if (station) {
      map.flyTo(
        [station.coordinates.lat, station.coordinates.lon],
        15,
        { animate: true, duration: 1 }
      )
    }
  }, [station, map])

  return null
}

// Component to track map center changes
function MapCenterTracker({ onCenterChange }: { onCenterChange: (center: [number, number]) => void }) {
  const map = useMap()

  useEffect(() => {
    const handleMoveEnd = () => {
      const center = map.getCenter()
      onCenterChange([center.lat, center.lng])
    }

    map.on('moveend', handleMoveEnd)
    return () => {
      map.off('moveend', handleMoveEnd)
    }
  }, [map, onCenterChange])

  return null
}

export default function Map() {

  const [stations, setStations] = useState<Station[]>([])
  const [isLoadingStations, setIsLoadingStations] = useState(true)
  const hasInitialLoadRef = useRef(false)
  const [stationsError, setStationsError] = useState<string | null>(null)

  // Cache for station charger info (maps station name to array of connector types)
  const [stationChargerTypes, setStationChargerTypes] = useState<Record<string, string[]>>({})

  // User location state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [_locationError, setLocationError] = useState<string | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(true)

  // Map center for fetching stations as user scrolls
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)
  const mapCenterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced map center update to prevent too many API calls
  const handleMapCenterChange = useCallback((center: [number, number]) => {
    if (mapCenterTimeoutRef.current) {
      clearTimeout(mapCenterTimeoutRef.current)
    }
    mapCenterTimeoutRef.current = setTimeout(() => {
      setMapCenter(center)
    }, 300)
  }, [])

  const navigate = useNavigate()
  const location = useLocation()
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)

  // Track if we've handled the navigation state (to avoid re-selecting on re-renders)
  const hasHandledNavState = useRef(false)
  const [isLeftSidebarMinimized, setIsLeftSidebarMinimized] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [maxDistance, setMaxDistance] = useState(5)
  const [chargerType, setChargerType] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isFiltersMinimized, setIsFiltersMinimized] = useState(false)

  // Fetch all points info once to get connector types and statuses
  const [allPointsInfo, setAllPointsInfo] = useState<Record<number, PointInfo>>({})

  // Get unique connector types from actual data
  const availableChargerTypes = useMemo(() => {
    const types = new Set<string>()
    Object.values(allPointsInfo).forEach(p => {
      if (p.connector_type) types.add(p.connector_type)
    })
    return Array.from(types).sort()
  }, [allPointsInfo])

  // Map of pointId -> connector_type for StationMarker
  const pointConnectorTypes = useMemo(() => {
    const map: Record<number, string> = {}
    Object.values(allPointsInfo).forEach(p => {
      if (p.connector_type) map[p.pointid] = p.connector_type
    })
    return map
  }, [allPointsInfo])

  const hasFetchedPointsInfo = useRef(false)

  useEffect(() => {
    const fetchAllPointsInfo = async () => {
      if (hasFetchedPointsInfo.current) return
      hasFetchedPointsInfo.current = true

      try {
        const points = await getAllPointsInfo()
        // Build a map of pointId -> full point info
        const pointsMap: Record<number, PointInfo> = {}
        points.forEach(p => {
          pointsMap[p.pointid] = p
        })
        setAllPointsInfo(pointsMap)
      } catch (err) {
        console.error('Error fetching points info:', err)
      }
    }

    fetchAllPointsInfo()
  }, [])

  // Build station charger types from allPointsInfo when stations or pointsInfo change
  useEffect(() => {
    if (stations.length === 0 || Object.keys(allPointsInfo).length === 0) return

    const newTypes: Record<string, string[]> = {}
    stations.forEach(station => {
      const connectorTypes = [...new Set(
        station.points
          .map(pointId => allPointsInfo[pointId]?.connector_type)
          .filter(Boolean)
      )] as string[]
      newTypes[station.station_name] = connectorTypes
    })
    setStationChargerTypes(newTypes)
  }, [stations, allPointsInfo])

  // Filtered stations based on search query, charger type, and status (when info is available)
  // Distance filtering is handled by the API radius parameter
  const filteredStations = useMemo(() => {
    return stations.filter(station => {
      // Filter by search query
      const matchesSearch = searchQuery === '' ||
        station.station_name.toLowerCase().includes(searchQuery.toLowerCase())

      // Filter by charger type if we have the info and a filter is selected
      const stationTypes = stationChargerTypes[station.station_name]
      const matchesChargerType = !chargerType ||
        !stationTypes ||  // Show if we haven't loaded types yet
        stationTypes.includes(chargerType)

      // Filter by status - check if station has any charger with the selected status
      const matchesStatus = !statusFilter ||
        Object.keys(allPointsInfo).length === 0 ||  // Show if we haven't loaded info yet
        station.points.some(pointId => allPointsInfo[pointId]?.status === statusFilter)

      return matchesSearch && matchesChargerType && matchesStatus
    })
  }, [stations, searchQuery, chargerType, stationChargerTypes, statusFilter, allPointsInfo])

  // Guest modal
  const [showGuestModal, setShowGuestModal] = useState(false)

  // Cancel reservation state
  const [cancelStatus, setCancelStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [cancelMessage, setCancelMessage] = useState('')

  // Trigger to refresh charger statuses
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Active reservation state - persists until cancelled or expired
  const [activeReservation, setActiveReservation] = useState<{
    charger: Charger
    endTime: string
    minutes: number
  } | null>(null)

  // Get user's location from browser first
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setIsLoadingLocation(false)
      return
    }

    // Check if we're on HTTPS (required for geolocation on mobile)
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    if (!isSecure) {
      console.warn('Geolocation may not work over HTTP on mobile browsers')
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation([latitude, longitude])
        setIsLoadingLocation(false)
        console.log('📍 User location:', latitude, longitude)
      },
      (error) => {
        console.warn('Geolocation error:', error.code, error.message)
        // Provide user-friendly error messages
        let errorMsg = error.message
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Location access denied. Please enable location permissions in your browser settings.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Location information unavailable. Please try again.'
            break
          case error.TIMEOUT:
            errorMsg = 'Location request timed out. Please check your connection and try again.'
            break
        }
        setLocationError(errorMsg)
        setIsLoadingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout for mobile networks
        maximumAge: 300000, // Cache location for 5 minutes
      }
    )
  }, [])

  useEffect(() => {
    const fetchStations = async () => {
      // Use map center for fetching (updates as user scrolls), fall back to user location or default
      const lat = mapCenter?.[0] ?? userLocation?.[0] ?? DEFAULT_CENTER[0];
      const lon = mapCenter?.[1] ?? userLocation?.[1] ?? DEFAULT_CENTER[1];
      // Use maxDistance filter (km) converted to meters as the search radius
      const searchRadius = maxDistance * 1000;

      try {
        // Only show loading state on initial load
        if (!hasInitialLoadRef.current) {
          setIsLoadingStations(true);
        }
        setStationsError(null);

        const response = await getStationsByLocation(lat, lon, searchRadius);
        console.log(`📍 Fetched stations within ${maxDistance}km (${searchRadius}m radius): ${response?.results?.length || 0} found`);

        if (response?.results?.length > 0) {
          const sorted = [...response.results].sort(
            (a, b) => (a.dist_from_user ?? Infinity) - (b.dist_from_user ?? Infinity)
          );
          setStations(sorted);
        } else {
          console.log('No stations found nearby');
          setStations([]);
        }
      } catch (err) {
        console.error('Error fetching stations:', err);
        if (!hasInitialLoadRef.current) {
          setStationsError('Could not load stations');
        }
      } finally {
        setIsLoadingStations(false);
        hasInitialLoadRef.current = true;
      }
    };

    if (!isLoadingLocation) {
      fetchStations();
    }
  }, [mapCenter, userLocation, isLoadingLocation, maxDistance]);

  // Handle navigation state from profile page (select station by pointId)
  useEffect(() => {
    // Only run once after stations have loaded
    if (hasHandledNavState.current || isLoadingStations || stations.length === 0) return

    const navState = location.state as { pointId?: number; lat?: number; lon?: number } | null
    if (!navState?.pointId) return

    hasHandledNavState.current = true

    // Find the station that contains this point
    const station = stations.find(s => s.points.includes(navState.pointId!))
    if (station) {
      setSelectedStation(station)
    }

    // Clear the navigation state to prevent re-selection on refresh
    window.history.replaceState({}, document.title)
  }, [isLoadingStations, stations, location.state])

  // Check for active reservations on load (only once after stations load)
  const [hasCheckedReservations, setHasCheckedReservations] = useState(false)

  useEffect(() => {
    // Only run once, after stations have loaded, and only for logged-in users
    if (hasCheckedReservations || isLoadingStations || isGuest()) return

    setHasCheckedReservations(true)

    const checkActiveReservation = async () => {
      try {
        const reservations = await getMyReservations()

        // API returns 204 (null) if no reservations
        if (!reservations || !Array.isArray(reservations)) return

        // Find active reservation
        const active = reservations.find((r: any) => r.status === 'active')
        if (!active) return

        // Use data directly from myreservations response (includes station_name, connector_type, power_kw)
        const chargerData: Charger = {
          id: String(active.pointid),
          name: active.station_name || 'Unknown Station',
          address: active.address || '',
          price: 0, // Not included in myreservations response
          available: 0,
          distance: 0,
          latitude: 0,
          longitude: 0,
          chargerType: active.connector_type || 'Unknown',
          status: 'Reserved' as AvailabilityStatus,
          power: active.power_kw ?? 0,
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
  }, [isLoadingStations, hasCheckedReservations])

  const handleCancelReservation = async () => {
    if (!activeReservation) return

    try {
      setCancelStatus('loading')
      setCancelMessage('')

      await cancelReservation(activeReservation.charger.id)

      setCancelStatus('idle')
      setCancelMessage('')
      setActiveReservation(null)
      setRefreshTrigger(prev => prev + 1)
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

  const handleReservationSuccess = (data: {
    pointId: number
    endTime: string
    stationName: string
    connectorType: string
    power: number
    price: number
    minutes: number
  }) => {
    // Find which station contains this point
    const station = stations.find(s => s.points.includes(data.pointId))

    // Create charger object with full details
    const chargerData: Charger = {
      id: String(data.pointId),
      name: data.stationName,
      address: '',
      price: data.price,
      available: 0,
      distance: station?.dist_from_user ?? 0,
      latitude: station?.coordinates.lat ?? 0,
      longitude: station?.coordinates.lon ?? 0,
      chargerType: data.connectorType,
      status: 'Reserved' as AvailabilityStatus,
      power: data.power,
    }

    setActiveReservation({
      charger: chargerData,
      endTime: data.endTime,
      minutes: data.minutes,
    })
  }

  // Loading state - only show on initial load, not on subsequent fetches
  if (isLoadingLocation || (isLoadingStations && !hasInitialLoadRef.current)) {
    return (
      <div className="map-container">
        <div className="loading-message">
          {isLoadingLocation ? 'Getting your location...' : 'Loading stations...'}
        </div>
      </div>
    )
  }

  // Error state
  if (stationsError) {
    return (
      <div className="map-container">
        <div className="error-message">{stationsError}</div>
      </div>
    )
  }


  // =========================
  // RENDER
  // =========================
  return (
    <div className="map-container">
      {/* Left Sidebar */}
      <div className={`sidebar sidebar-left ${isLeftSidebarMinimized ? 'minimized' : ''}`}>
        <SidebarHeader
          isMinimized={isLeftSidebarMinimized}
          onToggleMinimize={() => setIsLeftSidebarMinimized(!isLeftSidebarMinimized)}
          onProfileClick={() => {
            if (isGuest()) {
              setShowGuestModal(true)
            } else {
              navigate('/profile')
            }
          }}
        />
        <StationFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          maxDistance={maxDistance}
          onMaxDistanceChange={setMaxDistance}
          chargerType={chargerType}
          onChargerTypeChange={setChargerType}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          isMinimized={isFiltersMinimized}
          onToggleMinimized={() => setIsFiltersMinimized(!isFiltersMinimized)}
          availableChargerTypes={availableChargerTypes}
        />

        <StationsList
          stations={filteredStations}
          selectedStationName={selectedStation?.station_name || null}
          onSelectStation={setSelectedStation}
          stationChargerTypes={stationChargerTypes}
          selectedChargerType={chargerType}
          allPointsInfo={allPointsInfo}
          statusFilter={statusFilter}
        />
      </div>

      {/* Map area */}
      <div className="map-area">
        <MapContainer
          center={userLocation || DEFAULT_CENTER}
          zoom={userLocation ? LOCATION_ZOOM : DEFAULT_ZOOM}
          scrollWheelZoom={true}
          className="leaflet-container"
        >
          {/* Fix gray tiles issue */}
          <MapResizer sidebarMinimized={isLeftSidebarMinimized} />

          {/* Track map center for fetching stations as user scrolls */}
          <MapCenterTracker onCenterChange={handleMapCenterChange} />

          {/* Fly to selected station */}
          <FlyToStation station={selectedStation} />

          {/* Recenter button */}
          <RecenterButton
            userLocation={userLocation}
            onRecenter={() => setSelectedStation(null)}
          />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Circle overlay showing fetch radius */}
          {(mapCenter || userLocation) && (
            <Circle
              center={mapCenter || userLocation || DEFAULT_CENTER}
              radius={maxDistance * 1000}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '5, 5'
              }}
            />
          )}

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

          {/* Station markers */}
          {filteredStations.map(station => (
            <StationMarker
              key={`${station.station_name}-${station.coordinates.lat}-${station.coordinates.lon}`}
              station={station}
              isSelected={selectedStation?.station_name === station.station_name}
              onGuestWarning={() => setShowGuestModal(true)}
              onReservationSuccess={handleReservationSuccess}
              refreshTrigger={refreshTrigger}
              chargerTypeFilter={chargerType}
              statusFilter={statusFilter}
              pointConnectorTypes={pointConnectorTypes}
            />
          ))}
        </MapContainer>

        {/* Guest Warning Modal */}
        {showGuestModal && (
          <GuestWarningModal
            onClose={() => setShowGuestModal(false)}
            onLogin={() => navigate('/login')}
          />
        )}

        {/* Active Reservation Overlay - persistent until cancelled or expired */}
        {activeReservation && (
          <ActiveReservationOverlay
            reservation={activeReservation}
            onCancel={handleCancelReservation}
            onExpire={() => {
              setActiveReservation(null)
              setRefreshTrigger(prev => prev + 1)
            }}
            cancelStatus={cancelStatus}
            cancelMessage={cancelMessage}
          />
        )}
      </div>
    </div>
  )
}
