import { useState } from 'react'
import './map.css'

interface Charger {
  id: number
  name: string
  address: string
  price: number
  available: number
  distance: number
  rating: number
}

export default function Map() {
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null)
  const [filters, setFilters] = useState({
    priceRange: [0, 100],
    available: false,
    distance: 50,
  })

  // Mock charger data
  const chargers: Charger[] = [
    {
      id: 1,
      name: 'FastCharge Station',
      address: '123 Main St, Downtown',
      price: 0.45,
      available: 5,
      distance: 2.3,
      rating: 4.8,
    },
    {
      id: 2,
      name: 'EV Hub Center',
      address: '456 Tech Ave, Innovation District',
      price: 0.38,
      available: 2,
      distance: 4.1,
      rating: 4.5,
    },
    {
      id: 3,
      name: 'Green Energy Charging',
      address: '789 Eco Blvd, Sustainable Park',
      price: 0.32,
      available: 8,
      distance: 5.7,
      rating: 4.9,
    },
    {
      id: 4,
      name: 'PowerUp Station',
      address: '321 Energy St, Industrial Zone',
      price: 0.42,
      available: 1,
      distance: 3.2,
      rating: 4.3,
    },
    {
      id: 5,
      name: 'Quick Charge Hub',
      address: '654 Speed Lane, Commercial Area',
      price: 0.5,
      available: 6,
      distance: 1.8,
      rating: 4.6,
    },
  ]

  // Filter chargers based on criteria
  const filteredChargers = chargers.filter(charger => {
    const priceMatch =
      charger.price >= filters.priceRange[0] &&
      charger.price <= filters.priceRange[1]
    const availableMatch = !filters.available || charger.available > 0
    const distanceMatch = charger.distance <= filters.distance

    return priceMatch && availableMatch && distanceMatch
  })

  return (
    <div className="map-container">
      {/* Sidebar with filters */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>⚡ WattApp</h2>
          <p>Find Chargers</p>
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
                ${filters.priceRange[0].toFixed(2)} - ${filters.priceRange[1].toFixed(2)}
              </div>
            </div>
          </div>

          <div className="filter-group">
            <label>
              <input
                type="checkbox"
                checked={filters.available}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    available: e.target.checked,
                  }))
                }
              />
              <span>Available Only</span>
            </label>
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

        {/* Chargers List */}
        <div className="chargers-list">
          {filteredChargers.map(charger => (
            <div
              key={charger.id}
              className={`charger-card ${
                selectedCharger?.id === charger.id ? 'active' : ''
              }`}
              onClick={() => setSelectedCharger(charger)}
            >
              <div className="charger-name">{charger.name}</div>
              <div className="charger-info">
                <span className="price">${charger.price.toFixed(2)}/kWh</span>
                <span className="distance">{charger.distance} km</span>
              </div>
              <div className="charger-status">
                <span className={`available ${charger.available > 0 ? 'in-stock' : 'out-of-stock'}`}>
                  {charger.available} Available
                </span>
                <span className="rating">⭐ {charger.rating}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map area */}
      <div className="map-area">
        <div className="map-placeholder">
          <h3>📍 Map View</h3>
          <p>Chargers will appear on the map here</p>
          {selectedCharger && (
            <div className="selected-charger-info">
              <h4>{selectedCharger.name}</h4>
              <p>{selectedCharger.address}</p>
              <p>Price: ${selectedCharger.price.toFixed(2)}/kWh</p>
              <p>Available Chargers: {selectedCharger.available}</p>
              <p>Rating: ⭐ {selectedCharger.rating}</p>
              <button className="reserve-btn">Reserve Spot</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
