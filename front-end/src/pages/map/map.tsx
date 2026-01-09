import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './map.css'
import { useEffect } from 'react'
import { getPointsInfo, getAuthToken } from '../../services/api'

interface BackendPoint {
  pointid: string
  lat: number
  lon: number
  status: 'available' | 'charging' | 'reserved' | 'malfunction' | 'offline'
  cap: number
  kwhprice: number
}

interface BackendPointInfo extends BackendPoint {
  station_name?: string
  connector_type?: string
  address?: string
  providerName?: string
}






const mapStatus = (status: BackendPoint['status']): AvailabilityStatus => {
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


type ChargerType =
  | 'Type2'
  | 'AC_GB/T'
  | 'CCS'
  | 'CHAdeMO'
  | string

type AvailabilityStatus = 'Available' | 'Charging' | 'Reserved' | 'Offline' | 'Malfunction'

interface Charger {
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

export default function Map() {
  console.log('✅ Map component mounted')

  const [chargers, setChargers] = useState<Charger[]>([])
  const [isLoadingChargers, setIsLoadingChargers] = useState(true)
  const [chargersError, setChargersError] = useState<string | null>(null)

  const navigate = useNavigate()
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
  const [reserveMinutes, setReserveMinutes] = useState(30)
  const [reserveStatus, setReserveStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [reserveMessage, setReserveMessage] = useState('')



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
        chargerType: (p.connector_type as ChargerType) ,
        status: mapStatus(p.status),
        power: p.cap ?? 0,
      }))

      setChargers(mapped)
    } catch (err) {
      setChargersError('Could not load charging points')
    } finally {
      setIsLoadingChargers(false)
    }
  }

  fetchChargers()
}, [])


    if (isLoadingChargers) {
  return <div className="map-container">Loading chargers…</div>
}

    if (chargersError) {
  return <div className="map-container">{chargersError}</div>
}


 
  const API_BASE = 'http://localhost:9876/api' // change if needed

  // =========================
  // HELPERS
  // =========================
 
 /* const getChargerIcon = (chargerType: ChargerType): string => {
    const iconMap: Record<ChargerType, string> = {
      AC_Type2: '/src/assets/images/actyp2.jpg',
      'AC_GB/T': '/src/assets/images/gb-t_ac.jpg',
      DC_Fast_CCS: '/src/assets/images/ccs2.jpg',
      DC_Fast_CHAdeMO: '/src/assets/images/chademo.jpg',
    //  'DC_Fast_GB/T': '/src/assets/images/gb-t_dc.jpg',
    }
    return iconMap[chargerType]
  }
*/
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
    const token = getAuthToken()

    try {
      setReserveStatus('loading')
      setReserveMessage('')

      const res = await fetch(
        `${API_BASE}/reserve/${selectedCharger.id}/${minutes}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        }
      )

      if (res.ok) {
        setReserveStatus('success')
        setReserveMessage(`Reserved for ${minutes} minutes `)
        return
      }

      if (res.status === 400) {
        setReserveStatus('error')
        setReserveMessage('Point is not available for reservation.')
        return
      }

      if (res.status === 404) {
        setReserveStatus('error')
        setReserveMessage('Point not found.')
        return
      }

      setReserveStatus('error')
      setReserveMessage('Unexpected error. Please try again.')
    } catch (e) {
      setReserveStatus('error')
      setReserveMessage('Network error. Please try again.')
    }
  }

  //take chargers from dummy api 
 // const chargers: Charger[] = [];
  
  // Get unique charger types from all chargers
  const uniqueChargerTypes = Array.from(
    new Set(chargers.map(c => c.chargerType).filter(Boolean))
  ).sort()

  // Filter suggestions based on search input
  const chargerTypeSuggestions = uniqueChargerTypes.filter(type =>
    type.toLowerCase().includes(chargerTypeSearch.toLowerCase())
  )
  
  const filteredChargers = chargers.filter(charger => {
    const priceMatch = charger.price <= filters.maxPrice

    const availabilityMatch =
      filters.availabilityFilter === 'All' ||
      charger.status === filters.availabilityFilter

    const chargerTypeMatch =
      !filters.chargerTypeFilter ||
      charger.chargerType === filters.chargerTypeFilter

    return priceMatch && availabilityMatch && chargerTypeMatch
  })

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
            onClick={() => navigate('/profile')}
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
          center={[37.9761, 23.7348]}
          zoom={6}
          scrollWheelZoom={false}
          className="leaflet-container"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredChargers.map(charger => (
            <Marker
              key={charger.id}
              position={[charger.latitude, charger.longitude]}
              icon={L.icon({
                iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${getMapPinColor(
                  charger.status
                )}.png`,
                shadowUrl:
                  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
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
          ))}
        </MapContainer>

        {/* Selected charger panel */}
        {selectedCharger && (
          <>
            {console.log('Selected charger:', selectedCharger)}
            <div className="selected-charger-info">
            <div className="charger-icon-header">
              <img
                //src={getChargerIcon(selectedCharger.chargerType)}  //need fixing 
                alt={selectedCharger.chargerType}
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

        {/* Reserve modal */}
        {showReserveModal && selectedCharger && (
          <div className="modal-overlay" onClick={closeReserveModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
