import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './profile.css'
import { getMyReservations, logout, getCurrentUser } from '../../services/api'
import profileAvatarImg from '../../assets/images/profile-avatar.jpg'

interface User {
  _id?: string
  first_name?: string
  last_name?: string
  email?: string
  created_at?: string
}

interface Activity {
  id: number
  date: string
  type: 'charge' | 'reservation' | 'payment'
  value: number
  energyKwh?: number
  durationMin?: number
  status: 'completed' | 'pending' | 'cancelled' | 'expired' | 'active'
  location?: string
  chargerType?: string
  powerKw?: number
  endTime?: string
}

type DatePreset = 'lastMonth' | 'last3Months' | 'currentYear' | 'all' | 'custom'

function money(v: number) {
  return `$${v.toFixed(2)}`
}

export default function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User>({
    first_name: 'Loading...',
    last_name: '',
    email: 'Loading...',
    created_at: '2023-06-15',
  })
  const [allActivities, setAllActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)
        // Fetch current user
        const userData = await getCurrentUser()
        console.log('Current user data:', userData)

        // Support various possible backend field names
        const fullName: string | undefined =
          (userData.fullName as string | undefined) ||
          (userData.name as string | undefined)

        let firstNameFromApi: string | undefined =
          (userData.first_name as string | undefined) ||
          (userData.firstName as string | undefined)

        let lastNameFromApi: string | undefined =
          (userData.last_name as string | undefined) ||
          (userData.lastName as string | undefined)

        // If only fullName is provided, split it into first/last for display
        if ((!firstNameFromApi && !lastNameFromApi) && fullName) {
          const parts = fullName.trim().split(' ')
          firstNameFromApi = parts[0]
          lastNameFromApi = parts.slice(1).join(' ')
        }

        setUser({
          first_name: firstNameFromApi || 'User',
          last_name: lastNameFromApi || '',
          email: (userData.email as string | undefined) || '',
          created_at:
            (userData.created_at as string | undefined) ||
            (userData.createdAt as string | undefined) ||
            new Date().toISOString(),
        })

        // Fetch reservations for current user
        let reservations: any[] = []
        try {
          const resData = await getMyReservations()
          // If backend returned 204, apiCall would have thrown,
          // so we only reach here when we have JSON data
          if (Array.isArray(resData)) {
            reservations = resData
          }
        } catch {
          // No reservations or endpoint returned 204 – just ignore
          reservations = []
        }

        // Transform reservations to Activity format
        const reservationActivities = reservations.map((r, idx) => {
          const resStatus = (r.status || '').toLowerCase()
          let mappedStatus: Activity['status'] = 'pending'

          // First check if explicitly cancelled, completed, or converted
          if (resStatus === 'completed' || resStatus === 'converted') {
            mappedStatus = 'completed'
          } else if (resStatus === 'cancelled') {
            mappedStatus = 'cancelled'
          } else if (resStatus === 'expired') {
            mappedStatus = 'expired'
          } else if (resStatus === 'active') {
            // For active reservations, check if they've expired based on end_time
            const endTime = r.end_time ? new Date(r.end_time) : null
            const now = new Date()

            if (endTime) {
              if (now < endTime) {
                // Still within reservation window
                mappedStatus = 'active'
              } else {
                // End time has passed
                const hourAfterEnd = new Date(endTime.getTime() + 60 * 60 * 1000)
                if (now < hourAfterEnd) {
                  // Within 1 hour after end - show as expired (user might still be charging)
                  mappedStatus = 'expired'
                } else {
                  // More than 1 hour after - consider it completed/past
                  mappedStatus = 'completed'
                }
              }
            } else {
              mappedStatus = 'pending'
            }
          }

          // Use station_name or address from API, fallback to Point ID
          const locationDisplay = r.station_name || r.address || `Point ${r.pointid}`

          return {
            id: typeof r.id === 'number' ? r.id : idx,
            date: r.start_time || r.end_time || new Date().toISOString().split('T')[0],
            type: 'reservation' as const,
            value: 0,
            status: mappedStatus,
            location: locationDisplay,
            durationMin: r.duration_minutes,
            powerKw: r.power_kw,
            chargerType: r.connector_type,
            endTime: r.end_time,
          } as Activity
        })

        // Only show reservations in activity history
        setAllActivities(reservationActivities)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load data')
        setAllActivities([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])



  const [expandedId, setExpandedId] = useState<number | null>(null)

  const activities = useMemo(
    () =>
      [...allActivities].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [allActivities]
  )

  return (
    <div className="wa-shell">
      {/* Sidebar */}
      <aside className="wa-sidebar">
        <div className="wa-brand">
          <div className="wa-logo">⚡</div>
          <div className="wa-brand-text">
            <div className="wa-brand-name">WattApp</div>
            <div className="wa-brand-sub">Charge Smart, Drive Far</div>
          </div>
        </div>

        <nav className="wa-nav" aria-label="Main navigation">
          <button className="wa-nav-item" type="button" onClick={() => navigate('/map')}>
            <span className="wa-nav-ico">🗺️</span>
            <span>Find Chargers</span>
          </button>

          <button className="wa-nav-item active" type="button">
            <span className="wa-nav-ico">👤</span>
            <span>Profile & Stats</span>
          </button>
        </nav>

        <div className="wa-side-footer">
          {/* Hook to your auth later */}
          <button className="wa-ghost" type="button" onClick={() => logout().then(() => navigate('/login'))}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="wa-main">
        {/* Topbar */}
        <header className="wa-topbar">
          <div className="wa-page">
            <div className="wa-page-title">Profile</div>
            <div className="wa-page-sub">Account, history, and charging statistics</div>
          </div>


        </header>

        {/* Content */}
        <main className="wa-content">
          {loadError && (
            <div style={{
              color: '#d32f2f',
              backgroundColor: '#ffebee',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '16px'
            }}>
              Error loading data: {loadError}
            </div>
          )}

          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Loading profile data...
            </div>
          )}

          {!isLoading && (
            <>
              {/* Row: account */}
              <section className="wa-grid wa-grid-12">
                <div className="wa-card span-12">
                  <div className="wa-card-head">
                    <div>
                      <div className="wa-card-title">Account</div>
                      <div className="wa-card-sub">Your WattApp profile</div>
                    </div>
                  </div>

                  <div className="wa-profile">
                    <div className="wa-avatar">
                      <img src={profileAvatarImg} alt="Profile" className="wa-avatar-img" />
                    </div>
                    <div className="wa-profile-info">
                      <div className="wa-profile-name">{user.first_name} {user.last_name}</div>
                      <div className="wa-muted">{user.email}</div>
                      <div className="wa-muted">Member since {new Date(user.created_at || '2023-06-15').toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="wa-divider" />

                  <div className="wa-note">
                    <div className="wa-note-title">Tip</div>
                    <div className="wa-note-text">
                      Reservations and navigation start from <b>Find Chargers</b>.
                    </div>
                  </div>
                </div>
              </section>

              {/* Activity table */}
              <section className="wa-grid wa-grid-12">
                <div className="wa-card span-12">
                  <div className="wa-card-head">
                    <div>
                      <div className="wa-card-title">Activity History</div>
                      <div className="wa-card-sub">Click a row to expand</div>
                    </div>
                  </div>

                  {activities.length === 0 ? (
                    <div className="wa-empty">No reservations found.</div>
                  ) : (
                    <div className="wa-table">
                      <div className="wa-thead">
                        <div>Type</div>
                        <div>Location</div>
                        <div>Date</div>
                        <div className="right">Amount</div>
                        <div className="right">Status</div>
                      </div>

                      {activities.map(a => {
                        const open = expandedId === a.id
                        return (
                          <div key={a.id} className={`wa-row ${open ? 'open' : ''}`}>
                            <button className="wa-row-main" type="button" onClick={() => setExpandedId(open ? null : a.id)}>
                              <div className="cell">
                                <span className="wa-badge">
                                  {a.type === 'charge' && '⚡ Charging'}
                                  {a.type === 'reservation' && '🅿️ Reservation'}
                                  {a.type === 'payment' && '💳 Payment'}
                                </span>
                              </div>
                              <div className="cell wa-muted">{a.location || '—'}</div>
                              <div className="cell">{new Date(a.date).toLocaleString()}</div>
                              <div className="cell right">{money(a.value)}</div>
                              <div className="cell right">
                                <span className={`wa-status ${a.status}`}>{a.status}</span>
                              </div>
                            </button>

                            {open && (
                              <div className="wa-details">
                                <div className="wa-detail">
                                  <span className="k">Connector</span>
                                  <span className="v">{a.chargerType || '—'}</span>
                                </div>
                                <div className="wa-detail">
                                  <span className="k">Power</span>
                                  <span className="v">{a.powerKw ? `${a.powerKw} kW` : '—'}</span>
                                </div>
                                <div className="wa-detail">
                                  <span className="k">Energy</span>
                                  <span className="v">{a.energyKwh ? `${a.energyKwh.toFixed(1)} kWh` : '—'}</span>
                                </div>
                                <div className="wa-detail">
                                  <span className="k">Duration</span>
                                  <span className="v">{a.durationMin ? `${a.durationMin} min` : '—'}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
