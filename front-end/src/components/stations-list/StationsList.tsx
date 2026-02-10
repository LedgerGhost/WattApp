import type { Station } from '../../types'
import type { PointInfo } from '../../services/station'
import './StationsList.css'

interface StationsListProps {
  stations: Station[]
  selectedStationName: string | null
  onSelectStation: (station: Station) => void
  stationChargerTypes?: Record<string, string[]>
  selectedChargerType?: string
  allPointsInfo?: Record<number, PointInfo>
  statusFilter?: string
}

export default function StationsList({
  stations,
  selectedStationName,
  onSelectStation,
  stationChargerTypes = {},
  selectedChargerType = '',
  allPointsInfo = {},
  statusFilter = ''
}: StationsListProps) {
  return (
    <div className="stations-list">
      {stations.length === 0 ? (
        <div className="no-stations">No stations found nearby</div>
      ) : (
        stations.map(station => {
          const connectorTypes = stationChargerTypes[station.station_name] || []
          const hasSelectedType = selectedChargerType && connectorTypes.includes(selectedChargerType)

          // Count chargers matching the status filter
          const matchingStatusCount = statusFilter
            ? station.points.filter(pointId => allPointsInfo[pointId]?.status === statusFilter).length
            : 0

          return (
            <div
              key={`${station.station_name}-${station.coordinates.lat}-${station.coordinates.lon}`}
              className={`station-card ${selectedStationName === station.station_name ? 'active' : ''} ${hasSelectedType ? 'matches-filter' : ''}`}
              onClick={() => onSelectStation(station)}
            >
              <div className="station-card-name">{station.station_name}</div>

              {/* Charger types badges */}
              {connectorTypes.length > 0 && (
                <div className="station-card-types">
                  {connectorTypes.map(type => (
                    <span
                      key={type}
                      className={`charger-type-badge ${selectedChargerType === type ? 'highlighted' : ''}`}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              )}

              <div className="station-card-info">
                {station.dist_from_user != null && (
                  <span className="station-distance">
                    {station.dist_from_user.toFixed(1)} km
                  </span>
                )}
                <span className="station-chargers">
                  {statusFilter && matchingStatusCount > 0
                    ? `${matchingStatusCount} ${statusFilter}`
                    : `${station.points.length} charger${station.points.length !== 1 ? 's' : ''}`
                  }
                </span>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
