import './StationFilters.css'

// Available status options matching backend values
const AVAILABILITY_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'available', label: 'Available' },
  { value: 'charging', label: 'Charging' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'malfunction', label: 'Malfunction' },
  { value: 'offline', label: 'Offline' },
]

interface StationFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  maxDistance: number
  onMaxDistanceChange: (distance: number) => void
  chargerType: string
  onChargerTypeChange: (type: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  isMinimized: boolean
  onToggleMinimized: () => void
  availableChargerTypes?: string[]
}

export default function StationFilters({
  searchQuery,
  onSearchChange,
  maxDistance,
  onMaxDistanceChange,
  chargerType,
  onChargerTypeChange,
  statusFilter,
  onStatusFilterChange,
  isMinimized,
  onToggleMinimized,
  availableChargerTypes = []
}: StationFiltersProps) {
  return (
    <>
      <div className={`station-filters ${isMinimized ? 'minimized' : ''}`}>
        {/* Station Filters Section */}
        <div className="filter-section">
          <div className="filter-section-header">Station Filters</div>

          <div className="filter-group">
            <label>Search Station</label>
            <div className="search-container">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                className="station-search-input"
              />
              {searchQuery && (
                <button
                  className="clear-search-btn"
                  onClick={() => onSearchChange('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="filter-group">
            <label>Max Distance</label>
            <div className="distance-range">
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={maxDistance}
                onChange={e => onMaxDistanceChange(parseInt(e.target.value))}
              />
              <div className="distance-display">
                {maxDistance} km
              </div>
            </div>
          </div>
        </div>

        {/* Charger Filters Section */}
        <div className="filter-section">
          <div className="filter-section-header">Charger Filters</div>
          <div className="filter-section-hint">Applied when viewing station details</div>

          <div className="filter-group">
            <label>Charger Type</label>
            <select
              value={chargerType}
              onChange={e => onChargerTypeChange(e.target.value)}
              className="charger-type-select"
            >
              <option value="">All Types</option>
              {availableChargerTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Availability Status</label>
            <select
              value={statusFilter}
              onChange={e => onStatusFilterChange(e.target.value)}
              className="charger-type-select"
            >
              {AVAILABILITY_STATUSES.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
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
