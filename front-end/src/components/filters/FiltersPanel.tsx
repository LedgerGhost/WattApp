import { useState } from 'react'
import type { AvailabilityStatus } from '../../types'
import './FiltersPanel.css'

interface Filters {
  maxPrice: number
  availabilityFilter: 'All' | AvailabilityStatus
  chargerTypeFilter: string
}

interface FiltersPanelProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  uniqueChargerTypes: string[]
  isMinimized: boolean
  onToggleMinimized: () => void
}

export default function FiltersPanel({
  filters,
  onFiltersChange,
  uniqueChargerTypes,
  isMinimized,
  onToggleMinimized
}: FiltersPanelProps) {
  const [chargerTypeSearch, setChargerTypeSearch] = useState('')
  const [showChargerTypeSuggestions, setShowChargerTypeSuggestions] = useState(false)

  // Filter suggestions based on search input
  const chargerTypeSuggestions = uniqueChargerTypes.filter(type =>
    type.toLowerCase().includes(chargerTypeSearch.toLowerCase())
  )

  return (
    <>
      <div className={`filters ${isMinimized ? 'minimized' : ''}`}>
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
                onFiltersChange({
                  ...filters,
                  maxPrice: parseFloat(e.target.value),
                })
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
                      onFiltersChange({
                        ...filters,
                        availabilityFilter: e.target.value as typeof filters.availabilityFilter,
                      })
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
                  onFiltersChange({
                    ...filters,
                    chargerTypeFilter: '',
                  })
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
                        onFiltersChange({
                          ...filters,
                          chargerTypeFilter: type,
                        })
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
        onClick={onToggleMinimized}
        title={isMinimized ? 'Show filters' : 'Hide filters'}
      >
        {isMinimized ? '▼ Show Filters' : '▲ Hide Filters'}
      </button>
    </>
  )
}
