import { useState, useMemo } from 'react'
import './profile.css'

interface Activity {
  id: number
  date: string
  type: 'charge' | 'reservation' | 'payment'
  value: number
  duration?: number
  status: 'completed' | 'pending' | 'cancelled'
  location?: string
  chargerType?: string
  details?: string
}

interface Statistics {
  totalCount: number
  totalValue: number
  averageValue: number
  monthlyBreakdown: { month: string; count: number; value: number; average: number }[]
}

type DatePreset = 'all' | 'lastMonth' | 'last3Months' | 'currentYear' | 'custom'

export default function Profile() {
  // Mock user data
  const mockUser = {
    name: 'John Doe',
    email: 'john@example.com',
    joinDate: '2023-06-15',
  }

  // Mock activity data dummy data 
  const allActivities: Activity[] = [
    {
      id: 1,
      date: '2024-12-20',
      type: 'charge',
      value: 25.5,
      duration: 45,
      status: 'completed',
      location: 'Athens Downtown',
      chargerType: 'DC_Fast_CCS',
    },
    {
      id: 2,
      date: '2024-12-18',
      type: 'reservation',
      value: 0,
      status: 'completed',
      location: 'Thessaloniki Hub',
    },
    {
      id: 3,
      date: '2024-12-15',
      type: 'charge',
      value: 18.75,
      duration: 35,
      status: 'completed',
      location: 'Patras Port',
      chargerType: 'DC_Fast_CHAdeMO',
    },
    {
      id: 4,
      date: '2024-12-10',
      type: 'payment',
      value: 50.0,
      status: 'completed',
    },
    {
      id: 5,
      date: '2024-12-08',
      type: 'charge',
      value: 22.3,
      duration: 40,
      status: 'completed',
      location: 'Heraklion Station',
      chargerType: 'AC_Type2',
    },
    {
      id: 6,
      date: '2024-11-25',
      type: 'charge',
      value: 19.8,
      duration: 38,
      status: 'completed',
      location: 'Larissa Central',
      chargerType: 'AC_GB/T',
    },
    {
      id: 7,
      date: '2024-11-20',
      type: 'reservation',
      value: 0,
      status: 'cancelled',
      location: 'Athens Downtown',
    },
    {
      id: 8,
      date: '2024-11-15',
      type: 'charge',
      value: 24.5,
      duration: 50,
      status: 'completed',
      location: 'Syntagma Square',
      chargerType: 'DC_Fast_CCS',
    },
    {
      id: 9,
      date: '2024-10-30',
      type: 'payment',
      value: 75.0,
      status: 'completed',
    },
    {
      id: 10,
      date: '2024-10-15',
      type: 'charge',
      value: 21.6,
      duration: 42,
      status: 'completed',
      location: 'Patras Port',
      chargerType: 'DC_Fast_CHAdeMO',
    },
  ]

  // State management
  const [datePreset, setDatePreset] = useState<DatePreset>('lastMonth')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'value'>('date')
  const [expandedActivityId, setExpandedActivityId] = useState<number | null>(null)
  const [dateError, setDateError] = useState('')

  // Helper function to get date range based on preset
  const getDateRange = (): { start: Date; end: Date } => {
    const today = new Date()
    const end = new Date(today)

    switch (datePreset) {
      case 'lastMonth':
        return {
          start: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()),
          end,
        }
      case 'last3Months':
        return {
          start: new Date(today.getFullYear(), today.getMonth() - 3, today.getDate()),
          end,
        }
      case 'currentYear':
        return {
          start: new Date(today.getFullYear(), 0, 1),
          end,
        }
      case 'custom':
        return {
          start: customStartDate ? new Date(customStartDate) : new Date(0),
          end: customEndDate ? new Date(customEndDate) : today,
        }
      case 'all':
      default:
        return {
          start: new Date(2020, 0, 1),
          end,
        }
    }
  }

  // Validate and filter activities
  const { filteredActivities, stats, hasError } = useMemo(() => {
    const { start, end } = getDateRange()

    // Validate date range
    if (datePreset === 'custom' && customStartDate && customEndDate) {
      if (new Date(customStartDate) > new Date(customEndDate)) {
        setDateError('Start date cannot be after end date. Please check your selection.')
        return { filteredActivities: [], stats: null, hasError: true }
      }
    }
    setDateError('')

    // Filter activities
    const filtered = allActivities.filter(activity => {
      const activityDate = new Date(activity.date)
      return activityDate >= start && activityDate <= end
    })

    // Sort activities
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      } else {
        return b.value - a.value
      }
    })

    // Calculate statistics
    let statistics: Statistics | null = null
    if (sorted.length > 0) {
      const chargeActivities = sorted.filter(a => a.type === 'charge')
      const totalValue = chargeActivities.reduce((sum, a) => sum + a.value, 0)

      // Monthly breakdown
      const monthlyMap = new Map<string, { count: number; value: number }>()
      sorted.forEach(activity => {
        const date = new Date(activity.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const existing = monthlyMap.get(monthKey) || { count: 0, value: 0 }
        existing.count++
        if (activity.type === 'charge') {
          existing.value += activity.value
        }
        monthlyMap.set(monthKey, existing)
      })

      const monthlyBreakdown = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({
          month,
          count: data.count,
          value: data.value,
          average: data.value / data.count,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))

      statistics = {
        totalCount: sorted.length,
        totalValue: totalValue,
        averageValue: chargeActivities.length > 0 ? totalValue / chargeActivities.length : 0,
        monthlyBreakdown,
      }
    }

    return { filteredActivities: sorted, stats: statistics, hasError: false }
  }, [datePreset, customStartDate, customEndDate, sortBy])

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header">
        <div className="profile-user-info">
          <div className="profile-avatar">👤</div>
          <div className="profile-details">
            <h1>{mockUser.name}</h1>
            <p>{mockUser.email}</p>
            <p className="join-date">Member since {new Date(mockUser.joinDate).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="profile-controls">
        <div className="controls-header">
          <h2>📊 History & Statistics</h2>
        </div>

        {/* Date Range Controls */}
        <div className="controls-section">
          <h3>Time Period</h3>
          <div className="preset-buttons">
            {(['all', 'lastMonth', 'last3Months', 'currentYear', 'custom'] as const).map(preset => (
              <button
                key={preset}
                className={`preset-btn ${datePreset === preset ? 'active' : ''}`}
                onClick={() => setDatePreset(preset)}
              >
                {preset === 'all' && 'All Time'}
                {preset === 'lastMonth' && 'Last Month'}
                {preset === 'last3Months' && 'Last 3 Months'}
                {preset === 'currentYear' && 'This Year'}
                {preset === 'custom' && 'Custom'}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {datePreset === 'custom' && (
            <div className="custom-date-range">
              <div className="date-input-group">
                <label htmlFor="startDate">Start Date</label>
                <input
                  id="startDate"
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="date-input-group">
                <label htmlFor="endDate">End Date</label>
                <input
                  id="endDate"
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          )}

          {/* Date Error */}
          {dateError && (
            <div className="error-state">
              <span className="error-icon">⚠️</span>
              <p>{dateError}</p>
            </div>
          )}
        </div>

        {/* Sort Controls */}
        <div className="controls-section">
          <h3>Sort By</h3>
          <div className="sort-buttons">
            <button
              className={`sort-btn ${sortBy === 'date' ? 'active' : ''}`}
              onClick={() => setSortBy('date')}
            >
              📅 Date (Newest First)
            </button>
            <button
              className={`sort-btn ${sortBy === 'value' ? 'active' : ''}`}
              onClick={() => setSortBy('value')}
            >
              💰 Value (Highest First)
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      {hasError ? (
        <div className="error-state" style={{ margin: '20px 0' }}>
          <span className="error-icon">❌</span>
          <p>Unable to display statistics due to invalid date range</p>
        </div>
      ) : stats ? (
        <div className="statistics-section">
          <h2>📈 Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Activities</div>
              <div className="stat-value">{stats.totalCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Charged (kWh)</div>
              <div className="stat-value">${stats.totalValue.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Average per Charge</div>
              <div className="stat-value">${stats.averageValue.toFixed(2)}</div>
            </div>
          </div>

          {/* Monthly Breakdown */}
          {stats.monthlyBreakdown.length > 0 && (
            <div className="monthly-breakdown">
              <h3>Monthly Breakdown</h3>
              <div className="monthly-table">
                <div className="table-header">
                  <div className="col-month">Month</div>
                  <div className="col-count">Activities</div>
                  <div className="col-value">Total</div>
                  <div className="col-average">Average</div>
                </div>
                {stats.monthlyBreakdown.map((month, idx) => (
                  <div key={idx} className="table-row">
                    <div className="col-month">{month.month}</div>
                    <div className="col-count">{month.count}</div>
                    <div className="col-value">${month.value.toFixed(2)}</div>
                    <div className="col-average">${month.average.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trend Visualization */}
          {stats.monthlyBreakdown.length > 0 && (
            <div className="trend-visualization">
              <h3>⚡ Monthly Energy Consumption Chart</h3>
              <div className="chart-container">
                <div className="chart-y-axis">
                  <div className="y-label">kWh</div>
                </div>
                <div className="chart-area">
                  <div className="chart-grid">
                    <div className="grid-line" style={{ height: '0%' }}></div>
                    <div className="grid-line" style={{ height: '25%' }}></div>
                    <div className="grid-line" style={{ height: '50%' }}></div>
                    <div className="grid-line" style={{ height: '75%' }}></div>
                    <div className="grid-line" style={{ height: '100%' }}></div>
                  </div>

                  <div className="bars-wrapper">
                    {stats.monthlyBreakdown.map((month, idx) => {
                      const maxValue = Math.max(...stats.monthlyBreakdown.map(m => m.value)) || 1
                      const percentage = (month.value / maxValue) * 100
                      return (
                        <div key={idx} className="bar-group">
                          <div className="bar-wrapper">
                            <div
                              className="bar"
                              style={{
                                height: `${percentage}%`,
                              }}
                              title={`${month.month}: ${month.value.toFixed(2)} kWh`}
                            >
                              {percentage > 10 && (
                                <span className="bar-label">${month.value.toFixed(1)}</span>
                              )}
                            </div>
                          </div>
                          <div className="bar-month">{month.month.split('-')[1]}</div>
                          <div className="bar-count">{month.count} sessions</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Chart Legend and Stats */}
              <div className="chart-info">
                <div className="info-item">
                  <span className="info-icon">📊</span>
                  <div>
                    <div className="info-label">Peak Month</div>
                    <div className="info-value">
                      {stats.monthlyBreakdown.reduce((max, m) => (m.value > max.value ? m : max)).month} (
                      {stats.monthlyBreakdown.reduce((max, m) => (m.value > max.value ? m : max)).value.toFixed(2)} kWh)
                    </div>
                  </div>
                </div>
                <div className="info-item">
                  <span className="info-icon">📈</span>
                  <div>
                    <div className="info-label">Lowest Month</div>
                    <div className="info-value">
                      {stats.monthlyBreakdown.reduce((min, m) => (m.value < min.value ? m : min)).month} (
                      {stats.monthlyBreakdown.reduce((min, m) => (m.value < min.value ? m : min)).value.toFixed(2)} kWh)
                    </div>
                  </div>
                </div>
                <div className="info-item">
                  <span className="info-icon">⚡</span>
                  <div>
                    <div className="info-label">Average per Month</div>
                    <div className="info-value">
                      {(stats.monthlyBreakdown.reduce((sum, m) => sum + m.value, 0) / stats.monthlyBreakdown.length).toFixed(2)} kWh
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <h3>No data for this period</h3>
          <p>Try selecting a different time range to view your activity history</p>
        </div>
      )}

      {/* History Section */}
      <div className="history-section">
        <h2>📋 Activity History</h2>

        {filteredActivities.length === 0 && !hasError ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <h3>No activities found</h3>
            <p>No activities match your selected filters</p>
          </div>
        ) : (
          <div className="activities-list">
            {filteredActivities.map(activity => (
              <div key={activity.id} className="activity-card">
                <div className="activity-main" onClick={() => setExpandedActivityId(expandedActivityId === activity.id ? null : activity.id)}>
                  <div className="activity-icon">
                    {activity.type === 'charge' && '⚡'}
                    {activity.type === 'reservation' && '🅿️'}
                    {activity.type === 'payment' && '💳'}
                  </div>
                  <div className="activity-info">
                    <div className="activity-type">
                      {activity.type === 'charge' && 'Charging'}
                      {activity.type === 'reservation' && 'Reservation'}
                      {activity.type === 'payment' && 'Payment'}
                    </div>
                    {activity.location && <div className="activity-location">{activity.location}</div>}
                    <div className="activity-date">{new Date(activity.date).toLocaleDateString()} {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div className="activity-value">
                    <div className="value-amount">${activity.value.toFixed(2)}</div>
                    <div className={`status-badge ${activity.status}`}>{activity.status}</div>
                  </div>
                  <div className="expand-icon">{expandedActivityId === activity.id ? '▼' : '▶'}</div>
                </div>

                {/* Expanded Details */}
                {expandedActivityId === activity.id && (
                  <div className="activity-details">
                    <div className="detail-row">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value">
                        {activity.type === 'charge' && 'Charging Session'}
                        {activity.type === 'reservation' && 'Spot Reservation'}
                        {activity.type === 'payment' && 'Account Payment'}
                      </span>
                    </div>
                    {activity.location && (
                      <div className="detail-row">
                        <span className="detail-label">Location:</span>
                        <span className="detail-value">{activity.location}</span>
                      </div>
                    )}
                    {activity.chargerType && (
                      <div className="detail-row">
                        <span className="detail-label">Charger Type:</span>
                        <span className="detail-value">{activity.chargerType}</span>
                      </div>
                    )}
                    {activity.duration && (
                      <div className="detail-row">
                        <span className="detail-label">Duration:</span>
                        <span className="detail-value">{activity.duration} minutes</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="detail-label">Status:</span>
                      <span className={`detail-value status ${activity.status}`}>{activity.status}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Amount:</span>
                      <span className="detail-value">${activity.value.toFixed(2)}</span>
                    </div>
                    {activity.details && (
                      <div className="detail-row">
                        <span className="detail-label">Notes:</span>
                        <span className="detail-value">{activity.details}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
