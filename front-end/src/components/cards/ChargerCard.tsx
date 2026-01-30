import type { Charger } from '../../types'
import './ChargerCard.css'

interface ChargerCardProps {
  charger: Charger
  isSelected: boolean
  onClick: () => void
  onClose?: () => void
}

export default function ChargerCard({ charger, isSelected, onClick, onClose }: ChargerCardProps) {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose?.()
  }

  return (
    <div
      className={`charger-card ${isSelected ? 'active' : ''}`}
      onClick={onClick}
    >
      {onClose && (
        <button
          className="charger-card-close"
          onClick={handleClose}
          aria-label="Close"
          type="button"
        >
          ×
        </button>
      )}
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
        <span className={`status ${charger.status.toLowerCase()}`}>
          {charger.status}
        </span>
      </div>
    </div>
  )
}
