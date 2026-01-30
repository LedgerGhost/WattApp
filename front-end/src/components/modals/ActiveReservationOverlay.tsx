import type { Charger } from '../../types'
import { getChargerImage } from '../../utils/chargerImages'
import './ActiveReservationOverlay.css'

interface ActiveReservation {
  charger: Charger
  endTime: string
}

interface ActiveReservationOverlayProps {
  reservation: ActiveReservation
  onCancel: () => void
  cancelStatus: 'idle' | 'loading' | 'success' | 'error'
  cancelMessage?: string
}

export default function ActiveReservationOverlay({
  reservation,
  onCancel,
  cancelStatus,
  cancelMessage,
}: ActiveReservationOverlayProps) {
  return (
    <div className="active-reservation-overlay">
      <div className="reservation-header">
        <span className="reservation-badge">Active Reservation</span>
      </div>
      <div className="reservation-charger-info">
        <img
          src={getChargerImage(reservation.charger.chargerType)}
          alt={reservation.charger.chargerType || 'Charger'}
          className="charger-type-icon-small"
        />
        <div className="reservation-details">
          <h4>{reservation.charger.name}</h4>
          <p>{reservation.charger.address}</p>
          <div className="reservation-specs">
            <span>{reservation.charger.chargerType}</span>
            <span>{reservation.charger.power} kW</span>
            <span>${reservation.charger.price.toFixed(2)}/kWh</span>
          </div>
          <div className="reservation-time">
            <span className="time-label">Reserved until:</span>
            <span className="time-value">{reservation.endTime}</span>
          </div>
        </div>
      </div>
      {cancelStatus === 'error' && cancelMessage && (
        <div className="reservation-error">{cancelMessage}</div>
      )}
      <button
        className="cancel-reservation-btn"
        onClick={onCancel}
        disabled={cancelStatus === 'loading'}
      >
        {cancelStatus === 'loading' ? 'Cancelling...' : 'Cancel Reservation'}
      </button>
    </div>
  )
}
