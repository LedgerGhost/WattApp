import type { Charger } from '../../types'
import './ReserveModal.css'

interface ReserveModalProps {
  charger: Charger
  reserveMinutes: number
  onMinutesChange: (minutes: number) => void
  onConfirm: () => void
  onClose: () => void
  onCancelReservation?: () => void
  reserveStatus: 'idle' | 'loading' | 'success' | 'error'
  reserveMessage?: string
  cancelStatus?: 'idle' | 'loading' | 'success' | 'error'
  cancelMessage?: string
}

export default function ReserveModal({
  charger,
  reserveMinutes,
  onMinutesChange,
  onConfirm,
  onClose,
  onCancelReservation,
  reserveStatus,
  reserveMessage,
  cancelStatus = 'idle',
  cancelMessage,
}: ReserveModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {reserveStatus === 'success' ? (
          <>
            <div className="modal-header">
              <h3>Reservation Confirmed</h3>
              <button className="modal-close" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="modal-body success-body">
              {cancelStatus === 'success' ? (
                <>
                  <div className="success-icon" style={{ background: 'linear-gradient(135deg, #f6ad55 0%, #ed8936 100%)' }}>
                    ✓
                  </div>
                  <div className="success-message" style={{ color: '#c05621' }}>
                    {cancelMessage}
                  </div>
                  <p className="success-sub">Your reservation has been cancelled.</p>
                </>
              ) : (
                <>
                  <div className="success-icon">✓</div>
                  <div className="success-message">{reserveMessage}</div>
                  <p className="success-sub">Your spot has been reserved at {charger.name}</p>
                  {cancelStatus === 'error' && cancelMessage && (
                    <div className="modal-alert error" style={{ marginTop: '1rem' }}>
                      {cancelMessage}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              {cancelStatus !== 'success' && onCancelReservation && (
                <button
                  className="modal-btn secondary"
                  onClick={onCancelReservation}
                  disabled={cancelStatus === 'loading'}
                  style={{ marginRight: 'auto' }}
                >
                  {cancelStatus === 'loading' ? 'Cancelling...' : 'Cancel Reservation'}
                </button>
              )}
              <button className="modal-btn primary" onClick={onClose}>
                Close Window
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-header">
              <h3>Reserve: {charger.name}</h3>
              <button className="modal-close" onClick={onClose}>
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
                  onChange={e => onMinutesChange(parseInt(e.target.value, 10))}
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
                onClick={onClose}
                disabled={reserveStatus === 'loading'}
              >
                Cancel
              </button>

              <button
                className="modal-btn primary"
                onClick={onConfirm}
                disabled={reserveStatus === 'loading'}
              >
                {reserveStatus === 'loading' ? 'Reserving...' : 'Confirm Reservation'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
