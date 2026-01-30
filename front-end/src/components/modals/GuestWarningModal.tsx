import './ReserveModal.css'

interface GuestWarningModalProps {
  onClose: () => void
  onLogin: () => void
}

export default function GuestWarningModal({ onClose, onLogin }: GuestWarningModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Guest Mode</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body success-body">
          <div className="success-icon" style={{ background: 'linear-gradient(135deg, #f6ad55 0%, #ed8936 100%)' }}>
            🔒
          </div>
          <div className="success-message" style={{ color: '#c05621' }}>
            Login Required
          </div>
          <p className="success-sub">You need to log in to access this feature.</p>
        </div>
        <div className="modal-footer">
          <button className="modal-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal-btn primary"
            onClick={onLogin}
            style={{ background: 'linear-gradient(135deg, #f6ad55 0%, #ed8936 100%)' }}
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  )
}
