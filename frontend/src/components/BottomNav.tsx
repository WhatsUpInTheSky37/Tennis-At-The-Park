import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'

const items = [
  { to: '/dashboard', label: 'Home', icon: '\u2302' },
  { to: '/calendar', label: 'Calendar', icon: '\uD83D\uDCC5' },
  { to: '/challenges', label: 'Challenges', icon: '\u2694\uFE0F', showBadge: true },
  { to: '/players', label: 'Players', icon: '\uD83D\uDC65' },
  { to: '/leaderboards', label: 'Rankings', icon: '\uD83D\uDCCA' },
  { to: '/forum', label: 'Forum', icon: '\uD83D\uDCAC' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!user) return
    api.getPendingChallengeCount()
      .then(r => setPendingCount(r.count))
      .catch(() => {})

    // Poll every 30 seconds
    const interval = setInterval(() => {
      api.getPendingChallengeCount()
        .then(r => setPendingCount(r.count))
        .catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [user])

  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <button
          key={item.to}
          className={`bottom-nav-item ${location.pathname.startsWith(item.to) ? 'active' : ''}`}
          onClick={() => navigate(item.to)}
          aria-label={item.label}
          style={{ position: 'relative' }}
        >
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span>{item.label}</span>
          {item.showBadge && pendingCount > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: '50%', marginRight: -18,
              background: 'var(--red)', color: '#fff', borderRadius: '50%',
              width: 16, height: 16, fontSize: 10, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontWeight: 700
            }}>
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}
