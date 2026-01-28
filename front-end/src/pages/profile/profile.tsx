import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './profile.css'
import { getMyReservations, logout, getCurrentUser, getPointsInfo, getHealthCheck, resetpoints, updatePoint, isAdmin as checkIsAdmin } from '../../services/api'
import profileAvatarImg from '../../assets/images/profile-avatar.jpg'

interface User {
  _id?: string
  first_name?: string
  last_name?: string
  email?: string
  created_at?: string
  role?: string
}

interface Point {
  pointid: string
  station_name?: string
  address?: string
  status: string
  cap: number
  kwhprice: number
  connector_type?: string
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
    role: 'customer',
  })
  const [allActivities, setAllActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Admin-specific state
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminPoints, setAdminPoints] = useState<Point[]>([])
  const [adminStats, setAdminStats] = useState({
    totalPoints: 0,
    availablePoints: 0,
    chargingPoints: 0,
    offlinePoints: 0,
  })
  const [adminActionStatus, setAdminActionStatus] = useState<string | null>(null)
  const [healthCheckData, setHealthCheckData] = useState<any>(null)

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
          role: userData.role || 'customer',
        })

        // Check if user is admin
        const userIsAdmin = userData.role === 'admin'
        setIsAdmin(userIsAdmin)

        // Fetch admin-specific data
        if (userIsAdmin) {
          try {
            const pointsData = await getPointsInfo()
            const points = Array.isArray(pointsData) ? pointsData : (pointsData.points || [])
            setAdminPoints(points)

            // Calculate admin stats
            const total = points.length
            const available = points.filter((p: any) => p.status === 'available').length
            const charging = points.filter((p: any) => p.status === 'charging' || p.status === 'reserved').length
            const offline = points.filter((p: any) => p.status === 'offline' || p.status === 'malfunction').length

            setAdminStats({
              totalPoints: total,
              availablePoints: available,
              chargingPoints: charging,
              offlinePoints: offline,
            })
          } catch (adminErr) {
            console.error('Failed to fetch admin data:', adminErr)
          }
        }

        // Fetch reservations for current user (both admin and regular users)
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

  // Admin action handlers
  const handleHealthCheck = async () => {
    try {
      setAdminActionStatus('Running health check...')
      const result = await getHealthCheck()
      setHealthCheckData(result)
      setAdminActionStatus('Health check completed successfully!')
      setTimeout(() => setAdminActionStatus(null), 3000)
    } catch (err) {
      setAdminActionStatus(`Health check failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleResetPoints = async () => {
    if (!window.confirm('Are you sure you want to reset all charging points? This action cannot be undone.')) {
      return
    }
    try {
      setAdminActionStatus('Resetting points...')
      await resetpoints()
      setAdminActionStatus('Points reset successfully!')
      // Refresh the points list
      const pointsData = await getPointsInfo()
      const points = Array.isArray(pointsData) ? pointsData : (pointsData.points || [])
      setAdminPoints(points)
      setTimeout(() => setAdminActionStatus(null), 3000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      // Check if it's an authentication error
      if (errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.toLowerCase().includes('auth')) {
        setAdminActionStatus('Reset requires CLI authentication. Please use the CLI tool with: se2537 resetpoints')
      } else {
        setAdminActionStatus(`Reset failed: ${errorMsg}. Try using the CLI: se2537 resetpoints`)
      }
    }
  }

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
            <div className="wa-page-title">{isAdmin ? 'Admin Dashboard' : 'Profile'}</div>
            <div className="wa-page-sub">{isAdmin ? 'Manage charging stations and system' : 'Account, history, and charging statistics'}</div>
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

          {adminActionStatus && (
            <div style={{
              color: adminActionStatus.includes('failed') ? '#d32f2f' : '#2e7d32',
              backgroundColor: adminActionStatus.includes('failed') ? '#ffebee' : '#e8f5e9',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '16px'
            }}>
              {adminActionStatus}
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
                      <div className="wa-card-sub">{isAdmin ? 'Administrator Account' : 'Your WattApp profile'}</div>
                    </div>
                  </div>

                  <div className="wa-profile">
                    <div className="wa-avatar">
                      <img src={profileAvatarImg} alt="Profile" className="wa-avatar-img" />
                    </div>
                    <div className="wa-profile-info">
                      <div className="wa-profile-name">
                        {user.first_name} {user.last_name}
                        {isAdmin && <span className="wa-admin-badge">Admin</span>}
                      </div>
                      <div className="wa-muted">{user.email}</div>
                      <div className="wa-muted">Member since {new Date(user.created_at || '2023-06-15').toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="wa-divider" />

                  <div className="wa-note">
                    <div className="wa-note-title">{isAdmin ? 'Admin Tools' : 'Tip'}</div>
                    <div className="wa-note-text">
                      {isAdmin ? (
                        <>Use the controls below to manage charging stations, run health checks, and monitor system status.</>
                      ) : (
                        <>Reservations and navigation start from <b>Find Chargers</b>.</>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Admin-specific sections */}
              {isAdmin && (
                <>
                  {/* Admin Stats */}
                  <section className="wa-grid wa-grid-12">
                    <div className="wa-card span-12">
                      <div className="wa-card-head">
                        <div>
                          <div className="wa-card-title">Station Overview</div>
                          <div className="wa-card-sub">Real-time charging station statistics</div>
                        </div>
                      </div>

                      <div className="wa-stats">
                        <div className="wa-stat">
                          <div className="wa-stat-label">Total Stations</div>
                          <div className="wa-stat-value">{adminStats.totalPoints}</div>
                        </div>
                        <div className="wa-stat">
                          <div className="wa-stat-label">Available</div>
                          <div className="wa-stat-value" style={{ color: '#22c55e' }}>{adminStats.availablePoints}</div>
                        </div>
                        <div className="wa-stat">
                          <div className="wa-stat-label">In Use</div>
                          <div className="wa-stat-value" style={{ color: '#f59e0b' }}>{adminStats.chargingPoints}</div>
                        </div>
                        <div className="wa-stat">
                          <div className="wa-stat-label">Unavailable</div>
                          <div className="wa-stat-value" style={{ color: '#ef4444' }}>{adminStats.offlinePoints}</div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Admin Quick Actions */}
                  <section className="wa-grid wa-grid-12">
                    <div className="wa-card span-12">
                      <div className="wa-card-head">
                        <div>
                          <div className="wa-card-title">Quick Actions</div>
                          <div className="wa-card-sub">Administrative functions</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button className="wa-admin-btn" onClick={handleHealthCheck}>
                          🔍 Run Health Check
                        </button>
                        <button className="wa-admin-btn wa-admin-btn-danger" onClick={handleResetPoints}>
                          🔄 Reset All Points
                        </button>
                      </div>

                      {healthCheckData && (
                        <div className="wa-health-results">
                          <div className="wa-health-header">
                            <span className="wa-health-icon">✅</span>
                            <span className="wa-health-title">System Health: {healthCheckData.status || 'OK'}</span>
                          </div>

                          <div className="wa-health-grid">
                            <div className="wa-health-item">
                              <div className="wa-health-label">Database Connection</div>
                              <div className="wa-health-value">
                                <span className="wa-health-status-ok">Connected</span>
                              </div>
                            </div>
                            <div className="wa-health-item">
                              <div className="wa-health-label">Total Charge Points</div>
                              <div className="wa-health-value">{healthCheckData.n_charge_points ?? '—'}</div>
                            </div>
                            <div className="wa-health-item">
                              <div className="wa-health-label">Points Online</div>
                              <div className="wa-health-value" style={{ color: '#22c55e' }}>
                                {healthCheckData.n_charge_points_online ?? '—'}
                              </div>
                            </div>
                            <div className="wa-health-item">
                              <div className="wa-health-label">Points Offline</div>
                              <div className="wa-health-value" style={{ color: '#ef4444' }}>
                                {healthCheckData.n_charge_points_offline ?? '—'}
                              </div>
                            </div>
                          </div>

                          <div className="wa-health-db">
                            <span className="wa-health-db-label">DB Host:</span>
                            <code className="wa-health-db-value">{healthCheckData.dbconnection || 'N/A'}</code>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Charging Stations List */}
                  <section className="wa-grid wa-grid-12">
                    <div className="wa-card span-12">
                      <div className="wa-card-head">
                        <div>
                          <div className="wa-card-title">Charging Stations ({adminPoints.length})</div>
                          <div className="wa-card-sub">All registered charging points</div>
                        </div>
                      </div>

                      {adminPoints.length === 0 ? (
                        <div className="wa-empty">No charging stations found.</div>
                      ) : (
                        <div className="wa-table">
                          <div className="wa-thead">
                            <div>ID</div>
                            <div>Station Name</div>
                            <div>Type</div>
                            <div className="right">Power</div>
                            <div className="right">Price</div>
                            <div className="right">Status</div>
                          </div>

                          {adminPoints.slice(0, 20).map((point) => (
                            <div key={point.pointid} className="wa-row">
                              <div className="wa-row-main" style={{ cursor: 'default' }}>
                                <div className="cell">{point.pointid}</div>
                                <div className="cell wa-muted">{point.station_name || point.address || '—'}</div>
                                <div className="cell">{point.connector_type || '—'}</div>
                                <div className="cell right">{point.cap} kW</div>
                                <div className="cell right">${point.kwhprice?.toFixed(2) || '0.00'}/kWh</div>
                                <div className="cell right">
                                  <span className={`wa-status ${point.status}`}>{point.status}</span>
                                </div>
                              </div>
                            </div>
                          ))}

                          {adminPoints.length > 20 && (
                            <div className="wa-empty">
                              Showing first 20 of {adminPoints.length} stations
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}

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
