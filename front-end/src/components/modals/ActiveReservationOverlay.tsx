import { useState, useEffect } from 'react'
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
  onExpire?: () => void
  cancelStatus: 'idle' | 'loading' | 'success' | 'error'
  cancelMessage?: string
}

function parseEndTime(endTime: string): Date {
  // Handle formats like "2026-02-02T15:30:00" or "2026-02-02 15:30:00"
  const normalized = endTime.replace(' ', 'T')
  return new Date(normalized)
}

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Expired'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function ActiveReservationOverlay({
  reservation,
  onCancel,
  onExpire,
  cancelStatus,
  cancelMessage,
}: ActiveReservationOverlayProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const endDate = parseEndTime(reservation.endTime)
    return Math.max(0, Math.floor((endDate.getTime() - Date.now()) / 1000))
  })

  useEffect(() => {
    const endDate = parseEndTime(reservation.endTime)

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.floor((endDate.getTime() - Date.now()) / 1000))
      setSecondsRemaining(remaining)

      if (remaining <= 0) {
        onExpire?.()
      }
    }

    // Update immediately
    updateRemaining()

    // Update every second
    const interval = setInterval(updateRemaining, 1000)

    return () => clearInterval(interval)
  }, [reservation.endTime, onExpire])

  const isExpired = secondsRemaining <= 0

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
            <span className="time-label">Time remaining:</span>
            <span className={`time-value ${isExpired ? 'expired' : ''}`}>
              {formatTimeRemaining(secondsRemaining)}
            </span>
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
