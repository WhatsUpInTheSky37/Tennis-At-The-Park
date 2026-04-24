import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'

const items = [
  { to: '/dashboard', label: 'Home', icon: '⌂' },
  { to: '/activity', label: 'Activity', icon: '🎾' },
  { to: '/messages', label: 'Messages', icon: '✉', badgeKey: 'messages' as const },
  { to: '/forum', label: 'Forum', icon: '💬' },
  { to: '/players', label: 'Players', icon: '👥' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [unreadDms, setUnreadDms] = useState(0)

  useEffect(() => {
    if (!user) return
    const load = () => {
      api.getUnreadDmCount().then(r => setUnreadDms(r.count)).catch(() => {})
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [user])

  const getBadge = (key?: 'messages') => {
    if (key === 'messages') return unreadDms
    return 0
  }

  return (
    <nav className="bottom-nav">
      {items.map(item => {
        const badge = getBadge(item.badgeKey)
        return (
          <button
            key={item.to}
            className={`bottom-nav-item ${location.pathname.startsWith(item.to) ? 'active' : ''}`}
            onClick={() => navigate(item.to)}
            aria-label={item.label}
            style={{ position: 'relative' }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
            {badge > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: '50%', marginRight: -18,
                background: 'var(--red)', color: '#fff', borderRadius: '50%',
                width: 16, height: 16, fontSize: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontWeight: 700
              }}>
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
