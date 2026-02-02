import { useState, useEffect } from 'react'
import './SidebarHeader.css'

interface SidebarHeaderProps {
  isMinimized: boolean
  onToggleMinimize: () => void
  onProfileClick: () => void
}

export default function SidebarHeader({
  isMinimized,
  onToggleMinimize,
  onProfileClick
}: SidebarHeaderProps) {
  // Track if we're on mobile for arrow direction
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="sidebar-header">
      <div className="header-top">
        <h2>WattApp</h2>
        <div className="header-actions">
          <button
            type="button"
            className="minimize-btn"
            onClick={onToggleMinimize}
            title={isMinimized ? 'Expand filters' : 'Minimize filters'}
          >
            {isMobile
              ? (isMinimized ? '▼' : '▲')
              : (isMinimized ? '▶' : '◀')
            }
          </button>
        </div>
      </div>

      <button
        type="button"
        className="profile-btn"
        onClick={onProfileClick}
      >
        Profile
      </button>
    </div>
  )
}
