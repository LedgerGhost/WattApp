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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage or system preference
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) {
      return saved === 'true'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
    localStorage.setItem('darkMode', String(isDarkMode))
  }, [isDarkMode])

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev)
  }

  return (
    <div className="sidebar-header">
      <div className="header-top">
        <h2>WattApp</h2>
        <div className="header-actions">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleDarkMode}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button
            type="button"
            className="minimize-btn"
            onClick={onToggleMinimize}
            title={isMinimized ? 'Expand filters' : 'Minimize filters'}
          >
            {isMinimized ? '▶' : '◀'}
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
