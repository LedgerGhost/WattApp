import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './profile.css'

interface Activity {
  id: number
  date: string
  type: 'charge' | 'reservation' | 'payment'
  value: number
  energyKwh?: number
  durationMin?: number
  status: 'completed' | 'pending' | 'cancelled'
  location?: string
  chargerType?: string
  powerKw?: number
}

type DatePreset = 'lastMonth' | 'last3Months' | 'currentYear' | 'all' | 'custom'

function money(v: number) {
  return `$${v.toFixed(2)}`
}

export default function Profile() {
  const navigate = useNavigate()

  // Mock user data (swap with real API data later)
  const user = {
    name: 'John Doe',
    email: 'john@example.com',
    joinDate: '2023-06-15',
    vehicle: 'Tesla Model 3',
  }

  // Mock activity data
  const allActivities: Activity[] = [
    {
      id: 1,
      date: '2024-12-20',
      type: 'charge',
      value: 25.5,
      energyKwh: 32.4,
      durationMin: 45,
      status: 'completed',
      location: 'Athens Downtown',
      chargerType: 'DC_Fast_CCS',
      powerKw: 50,
    },
    {
      id: 2,
      date: '2024-12-18',
      type: 'reservation',
      value: 0,
      status: 'completed',
      location: 'Thessaloniki Hub',
      chargerType: 'DC_Fast_CHAdeMO',
      powerKw: 50,
    },
    {
      id: 3,
      date: '2024-12-15',
      type: 'charge',
      value: 18.75,
      energyKwh: 24.1,
      durationMin: 35,
      status: 'completed',
      location: 'Patras Port',
      chargerType: 'DC_Fast_CHAdeMO',
      powerKw: 50,
    },
    { id: 4, date: '2024-12-10', type: 'payment', value: 50.0, status: 'completed' },
    {
      id: 5,
      date: '2024-12-08',
      type: 'charge',
      value: 22.3,
      energyKwh: 28.2,
      durationMin: 40,
      status: 'completed',
      location: 'Heraklion Station',
      chargerType: 'AC_Type2',
      powerKw: 22,
    },
  ]

  const [datePreset, setDatePreset] = useState<DatePreset>('lastMonth')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [dateError, setDateError] = useState('')

  const range = () => {
    const today = new Date()
    const end = new Date(today)

    switch (datePreset) {
      case 'lastMonth':
        return { start: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()), end }
      case 'last3Months':
        return { start: new Date(today.getFullYear(), today.getMonth() - 3, today.getDate()), end }
      case 'currentYear':
        return { start: new Date(today.getFullYear(), 0, 1), end }
      case 'custom':
        return {
          start: customStartDate ? new Date(customStartDate) : new Date(0),
          end: customEndDate ? new Date(customEndDate) : today,
        }
      case 'all':
      default:
        return { start: new Date(2020, 0, 1), end }
    }
  }

  const computed = useMemo(() => {
    const { start, end } = range()

    if (datePreset === 'custom' && customStartDate && customEndDate) {
      if (new Date(customStartDate) > new Date(customEndDate)) {
        setDateError('Start date cannot be after end date.')
        return { items: [], stats: null as any, hasError: true }
      }
    }
    setDateError('')

    const items = allActivities
      .filter(a => {
        const d = new Date(a.date)
        return d >= start && d <= end
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const charges = items.filter(a => a.type === 'charge')
    const totalCost = charges.reduce((s, a) => s + a.value, 0)
    const totalKwh = charges.reduce((s, a) => s + (a.energyKwh ?? 0), 0)
    const avgCostPerKwh = totalKwh > 0 ? totalCost / totalKwh : 0

    return {
      items,
      hasError: false,
      stats: {
        totalActivities: items.length,
        sessions: charges.length,
        totalCost,
        totalKwh,
        avgCostPerKwh,
      },
    }
  }, [datePreset, customStartDate, customEndDate])

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
          <button className="wa-ghost" type="button" onClick={() => navigate('/login')}>
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

          <div className="wa-actions">
            <button className="wa-icon" type="button" aria-label="Notifications">
              🔔
            </button>
            <button className="wa-icon" type="button" aria-label="Account">
              👤
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="wa-content">
          {/* Row: account + stats */}
          <section className="wa-grid wa-grid-12">
            <div className="wa-card span-5">
              <div className="wa-card-head">
                <div>
                  <div className="wa-card-title">Account</div>
                  <div className="wa-card-sub">Your WattApp profile</div>
                </div>
              </div>

              <div className="wa-profile">
                <div className="wa-avatar">👤</div>
                <div className="wa-profile-info">
                  <div className="wa-profile-name">{user.name}</div>
                  <div className="wa-muted">{user.email}</div>
                  <div className="wa-muted">Member since {new Date(user.joinDate).toLocaleDateString()}</div>
                  <div className="wa-muted">Vehicle: {user.vehicle}</div>
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

            <div className="wa-card span-7">
              <div className="wa-card-head">
                <div>
                  <div className="wa-card-title">History & Statistics</div>
                  <div className="wa-card-sub">Filter by time period</div>
                </div>
              </div>

              <div className="wa-section">
                <div className="wa-section-title">Time period</div>
                <div className="wa-pills">
                  <button className={`wa-pill ${datePreset === 'lastMonth' ? 'active' : ''}`} onClick={() => setDatePreset('lastMonth')} type="button">
                    Last Month
                  </button>
                  <button className={`wa-pill ${datePreset === 'last3Months' ? 'active' : ''}`} onClick={() => setDatePreset('last3Months')} type="button">
                    Last 3 Months
                  </button>
                  <button className={`wa-pill ${datePreset === 'currentYear' ? 'active' : ''}`} onClick={() => setDatePreset('currentYear')} type="button">
                    This Year
                  </button>
                  <button className={`wa-pill ${datePreset === 'all' ? 'active' : ''}`} onClick={() => setDatePreset('all')} type="button">
                    All Time
                  </button>
                  <button className={`wa-pill ${datePreset === 'custom' ? 'active' : ''}`} onClick={() => setDatePreset('custom')} type="button">
                    Custom
                  </button>
                </div>

                {datePreset === 'custom' && (
                  <div className="wa-dates">
                    <label className="wa-date">
                      <span>Start</span>
                      <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
                    </label>
                    <label className="wa-date">
                      <span>End</span>
                      <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
                    </label>
                  </div>
                )}

                {dateError && <div className="wa-error">⚠ {dateError}</div>}
              </div>

              <div className="wa-divider" />

              {computed.hasError ? (
                <div className="wa-error">❌ Invalid date range.</div>
              ) : (
                <div className="wa-stats">
                  <div className="wa-stat">
                    <div className="wa-stat-label">Total Activities</div>
                    <div className="wa-stat-value">{computed.stats.totalActivities}</div>
                  </div>
                  <div className="wa-stat">
                    <div className="wa-stat-label">Total Energy</div>
                    <div className="wa-stat-value">{computed.stats.totalKwh.toFixed(1)} kWh</div>
                  </div>
                  <div className="wa-stat">
                    <div className="wa-stat-label">Total Cost</div>
                    <div className="wa-stat-value">{money(computed.stats.totalCost)}</div>
                  </div>
                  <div className="wa-stat">
                    <div className="wa-stat-label">Avg Cost / kWh</div>
                    <div className="wa-stat-value">{money(computed.stats.avgCostPerKwh)}</div>
                  </div>
                </div>
              )}
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

              {computed.items.length === 0 ? (
                <div className="wa-empty">No activity found for this period.</div>
              ) : (
                <div className="wa-table">
                  <div className="wa-thead">
                    <div>Type</div>
                    <div>Location</div>
                    <div>Date</div>
                    <div className="right">Amount</div>
                    <div className="right">Status</div>
                  </div>

                  {computed.items.map(a => {
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
        </main>
      </div>
    </div>
  )
}
