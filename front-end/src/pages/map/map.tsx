import { useState, useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import './map.css'
import { getMyReservations, cancelReservation } from '../../services/chargers'
import { getStationsByLocation, getPointById, getPointsByIds } from '../../services/station'
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
function MapResizer() {
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

export default function Map() {

  const [stations, setStations] = useState<Station[]>([])
  const [isLoadingStations, setIsLoadingStations] = useState(true)
  const hasInitialLoadRef = useRef(false)
  const [stationsError, setStationsError] = useState<string | null>(null)

  // Cache for station charger info (maps station name to array of connector types)
  const [stationChargerTypes, setStationChargerTypes] = useState<Record<string, string[]>>({})
  const fetchedStationsRef = useRef<Set<string>>(new Set())

  // User location state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [_locationError, setLocationError] = useState<string | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(true)

  const navigate = useNavigate()
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [isLeftSidebarMinimized, setIsLeftSidebarMinimized] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [maxDistance, setMaxDistance] = useState(50)
  const [chargerType, setChargerType] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isFiltersMinimized, setIsFiltersMinimized] = useState(false)

  // Common EV charger connector types (hardcoded for performance - no need to fetch all points)
  const availableChargerTypes = useMemo(() => [
    'CCS',
    'CHAdeMO',
    'Type 2',
    'Type 1',
    'Tesla',
    'GB/T',
  ], [])

  // Pre-fetch charger info for stations to show connector types in the list
  useEffect(() => {
    const fetchStationChargerInfo = async () => {
      // Only fetch for stations we haven't fetched yet (using ref to avoid infinite loops)
      const stationsToFetch = stations.filter(
        s => !fetchedStationsRef.current.has(s.station_name)
      )

      if (stationsToFetch.length === 0) return

      // Mark stations as being fetched
      stationsToFetch.forEach(s => fetchedStationsRef.current.add(s.station_name))

      // Fetch in batches to avoid too many parallel requests
      const batchSize = 5
      for (let i = 0; i < stationsToFetch.length; i += batchSize) {
        const batch = stationsToFetch.slice(i, i + batchSize)

        const batchResults = await Promise.allSettled(
          batch.map(async station => {
            const points = await getPointsByIds(station.points)
            const connectorTypes = [...new Set(
              points.map(p => p.connector_type).filter(Boolean)
            )] as string[]
            return { stationName: station.station_name, connectorTypes }
          })
        )

        // Update cache with successful results
        const newTypes: Record<string, string[]> = {}
        batchResults.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            newTypes[result.value.stationName] = result.value.connectorTypes
          } else {
            // Mark as fetched but empty on error
            newTypes[batch[idx].station_name] = []
          }
        })

        setStationChargerTypes(prev => ({ ...prev, ...newTypes }))
      }
    }

    if (stations.length > 0) {
      fetchStationChargerInfo()
    }
  }, [stations])

  // Filtered stations based on search query and charger type (when info is available)
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

      return matchesSearch && matchesChargerType
    })
  }, [stations, searchQuery, chargerType, stationChargerTypes])

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

  useEffect(() => {
    const fetchStations = async () => {
      // Use user location as center (for accurate dist_from_user), fall back to default
      const lat = userLocation?.[0] ?? DEFAULT_CENTER[0];
      const lon = userLocation?.[1] ?? DEFAULT_CENTER[1];
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
  }, [userLocation, isLoadingLocation, maxDistance]);

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

        // Fetch the point info for the active reservation
        try {
          const pointInfo = await getPointById(active.pointid)

          const chargerData: Charger = {
            id: String(pointInfo.pointid),
            name: pointInfo.station_name || 'Unknown Station',
            address: '',
            price: pointInfo.kwhprice ?? 0,
            available: pointInfo.status === 'available' ? 1 : 0,
            distance: 0,
            latitude: parseFloat(pointInfo.lat),
            longitude: parseFloat(pointInfo.lon),
            chargerType: pointInfo.connector_type || 'Unknown',
            status: 'Reserved' as AvailabilityStatus,
            power: pointInfo.cap ?? 0,
          }

          setActiveReservation({
            charger: chargerData,
            endTime: active.end_time,
            minutes: active.duration_minutes,
          })
        } catch (err) {
          console.warn('Failed to fetch point info for reservation:', err)
        }
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

  const handleReservationSuccess = (pointId: number, endTime: string) => {
    // Find which station contains this point
    const station = stations.find(s => s.points.includes(pointId))

    // Create a basic charger object for the overlay
    const chargerData: Charger = {
      id: String(pointId),
      name: station?.station_name || 'Unknown Station',
      address: '',
      price: 0,
      available: 0,
      distance: station?.dist_from_user ?? 0,
      latitude: station?.coordinates.lat ?? 0,
      longitude: station?.coordinates.lon ?? 0,
      chargerType: 'Unknown',
      status: 'Reserved' as AvailabilityStatus,
      power: 0,
    }

    setActiveReservation({
      charger: chargerData,
      endTime: endTime,
      minutes: 30, // Default
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
          <MapResizer />

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
            cancelStatus={cancelStatus}
            cancelMessage={cancelMessage}
          />
        )}
      </div>
    </div>
  )
}