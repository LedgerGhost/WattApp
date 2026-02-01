import type { Charger } from '../../types'
import { getChargerImage } from '../../utils/chargerImages'
import './SelectedChargerPanel.css'

interface SelectedChargerPanelProps {
  charger: Charger
  onReserve: () => void
}

export default function SelectedChargerPanel({
  charger,
  onReserve
}: SelectedChargerPanelProps) {
  const isAvailable = charger.status === 'Available'

  return (
    <div className="selected-charger-info">
      <div className="charger-icon-header">
        <img
          src={getChargerImage(charger.chargerType)}
          alt={charger.chargerType || 'Charger'}
          className="charger-type-icon"
        />
      </div>

      <h4>{charger.name}</h4>
      <p>{charger.address}</p>

      <div className="charger-details">
        <div className="detail-item">
          <span className="label">Type:</span>
          <span className="value">{charger.chargerType}</span>
        </div>
        <div className="detail-item">
          <span className="label">Power:</span>
          <span className="value">{charger.power} kW</span>
        </div>
        <div className="detail-item">
          <span className="label">Price:</span>
          <span className="value">${charger.price.toFixed(2)}/kWh</span>
        </div>
        <div className="detail-item">
          <span className="label">Status:</span>
          <span className={`value status ${charger.status.toLowerCase()}`}>
            {charger.status}
          </span>
        </div>
      </div>

      <button
        className="reserve-btn"
        onClick={onReserve}
        disabled={!isAvailable}
        title={!isAvailable ? 'Can only reserve available chargers' : 'Reserve this charger'}
      >
        Reserve Spot
      </button>
    </div>
  )
}
