import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './map.css'

type ChargerType =
  | 'AC_Type2'
  | 'AC_GB/T'
  | 'DC_Fast_CCS'
  | 'DC_Fast_CHAdeMO'
  | 'DC_Fast_GB/T'

type AvailabilityStatus = 'Available' | 'Charging' | 'Offline' | 'Malfunction'

interface Charger {
  id: number
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
  const navigate = useNavigate()
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null)

  const [filters, setFilters] = useState<{
    priceRange: [number, number]
    availabilityFilter: 'All' | AvailabilityStatus
    chargerTypeFilter: ChargerType[]
    distance: number
  }>({
    priceRange: [0, 1],
    availabilityFilter: 'All',
    chargerTypeFilter: [],
    distance: 50,
  })

  // =========================
  // RESERVE MODAL STATE
  // =========================
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [reserveMinutes, setReserveMinutes] = useState(30)
  const [reserveStatus, setReserveStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [reserveMessage, setReserveMessage] = useState('')

  const API_BASE = 'http://localhost:9876/api' // change if needed

  // =========================
  // HELPERS
  // =========================
  const getChargerIcon = (chargerType: ChargerType): string => {
    const iconMap: Record<ChargerType, string> = {
      AC_Type2: '/src/assets/images/actyp2.jpg',
      'AC_GB/T': '/src/assets/images/gb-t_ac.jpg',
      DC_Fast_CCS: '/src/assets/images/ccs2.jpg',
      DC_Fast_CHAdeMO: '/src/assets/images/chademo.jpg',
      'DC_Fast_GB/T': '/src/assets/images/gb-t_dc.jpg',
    }
    return iconMap[chargerType]
  }

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

    try {
      setReserveStatus('loading')
      setReserveMessage('')

      const res = await fetch(
        `${API_BASE}/reserve/${selectedCharger.id}/${minutes}`,
        {
          method: 'POST',
          headers: {
            // Add auth headers if your backend needs them, e.g.:
            // 'X-API-KEY': apiKey,
            // 'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (res.ok) {
        setReserveStatus('success')
        setReserveMessage(`Reserved for ${minutes} minutes ✅`)
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

  // =========================
  // DATA (mock)
  // =========================
  const chargers: Charger[] = [
    {
      id: 1,
      name: 'FastCharge Athens',
      address: 'Syntagma, Athens',
      price: 0.45,
      available: 5,
      distance: 2.3,
      latitude: 37.9761,
      longitude: 23.7348,
      chargerType: 'DC_Fast_CCS',
      status: 'Available',
      power: 150,
    },
    {
      id: 2,
      name: 'EV Hub Thessaloniki',
      address: 'Aristotelous Square, Thessaloniki',
      price: 0.38,
      available: 2,
      distance: 4.1,
      latitude: 40.6332,
      longitude: 22.9411,
      chargerType: 'AC_Type2',
      status: 'Charging',
      power: 22,
    },
    {
      id: 3,
      name: 'Green Energy Charging Patras',
      address: 'Patras Port, Patras',
      price: 0.32,
      available: 8,
      distance: 5.7,
      latitude: 38.2466,
      longitude: 21.7345,
      chargerType: 'DC_Fast_CHAdeMO',
      status: 'Available',
      power: 50,
    },
    {
      id: 4,
      name: 'PowerUp Station Heraklion',
      address: 'Old Port, Heraklion',
      price: 0.42,
      available: 1,
      distance: 3.2,
      latitude: 35.3387,
      longitude: 25.1442,
      chargerType: 'DC_Fast_GB/T',
      status: 'Available',
      power: 100,
    },
    {
      id: 5,
      name: 'Quick Charge Hub Larissa',
      address: 'Central Station, Larissa',
      price: 0.5,
      available: 6,
      distance: 1.8,
      latitude: 39.6364,
      longitude: 22.6158,
      chargerType: 'AC_GB/T',
      status: 'Available',
      power: 11,
    },
  ]

  const filteredChargers = chargers.filter(charger => {
    const priceMatch =
      charger.price >= filters.priceRange[0] &&
      charger.price <= filters.priceRange[1]

    const availabilityMatch =
      filters.availabilityFilter === 'All' ||
      charger.status === filters.availabilityFilter

    const chargerTypeMatch =
      filters.chargerTypeFilter.length === 0 ||
      filters.chargerTypeFilter.includes(charger.chargerType)

    const distanceMatch = charger.distance <= filters.distance

    return priceMatch && availabilityMatch && chargerTypeMatch && distanceMatch
  })

  // =========================
  // RENDER
  // =========================
  return (
    <div className="map-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>⚡ WattApp</h2>

          <button
            type="button"
            className="profile-btn"
            onClick={() => navigate('/profile')}
          >
            Profile
          </button>
        </div>

        {/* Filters */}
        <div className="filters">
          <div className="filter-group">
            <label>Price Range ($/kWh)</label>
            <div className="price-range">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={filters.priceRange[0]}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    priceRange: [parseFloat(e.target.value), prev.priceRange[1]],
                  }))
                }
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={filters.priceRange[1]}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    priceRange: [prev.priceRange[0], parseFloat(e.target.value)],
                  }))
                }
              />
              <div className="price-display">
                ${filters.priceRange[0].toFixed(2)} - $
                {filters.priceRange[1].toFixed(2)}
              </div>
            </div>
          </div>

          <div className="filter-group">
            <label>Availability Status</label>
            <div className="availability-filter">
              {(['All', 'Available', 'Charging', 'Offline', 'Malfunction'] as const).map(
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
            <div className="charger-type-filter">
              <div className="filter-subgroup">
                <strong>AC Mode</strong>
                {(['AC_Type2', 'AC_GB/T'] as const).map(type => (
                  <label key={type} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.chargerTypeFilter.includes(type)}
                      onChange={e => {
                        setFilters(prev => ({
                          ...prev,
                          chargerTypeFilter: e.target.checked
                            ? [...prev.chargerTypeFilter, type]
                            : prev.chargerTypeFilter.filter(t => t !== type),
                        }))
                      }}
                    />
                    <span>{type === 'AC_Type2' ? 'Type 2' : 'GB/T'}</span>
                  </label>
                ))}
              </div>

              <div className="filter-subgroup">
                <strong>DC Fast</strong>
                {(['DC_Fast_CCS', 'DC_Fast_CHAdeMO', 'DC_Fast_GB/T'] as const).map(type => (
                  <label key={type} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.chargerTypeFilter.includes(type)}
                      onChange={e => {
                        setFilters(prev => ({
                          ...prev,
                          chargerTypeFilter: e.target.checked
                            ? [...prev.chargerTypeFilter, type]
                            : prev.chargerTypeFilter.filter(t => t !== type),
                        }))
                      }}
                    />
                    <span>{type.replace('DC_Fast_', '')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="filter-group">
            <label>Distance (km)</label>
            <input
              type="range"
              min="1"
              max="50"
              value={filters.distance}
              onChange={e =>
                setFilters(prev => ({
                  ...prev,
                  distance: parseFloat(e.target.value),
                }))
              }
            />
            <div className="distance-display">{filters.distance.toFixed(1)} km</div>
          </div>
        </div>

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
          <div className="selected-charger-info">
            <div className="charger-icon-header">
              <img
                src={getChargerIcon(selectedCharger.chargerType)}
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

            <button className="reserve-btn" onClick={openReserveModal}>
              Reserve Spot
            </button>
          </div>
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
