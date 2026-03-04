import { useNavigate, useLocation } from 'react-router-dom'

const items = [
  { to: '/dashboard', label: 'Home', icon: '⌂' },
  { to: '/sessions', label: 'Schedule', icon: '📅' },
  { to: '/players', label: 'Players', icon: '👥' },
  { to: '/matches', label: 'Matches', icon: '🏆' },
  { to: '/leaderboards', label: 'Rankings', icon: '📊' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <button
          key={item.to}
          className={`bottom-nav-item ${location.pathname.startsWith(item.to) ? 'active' : ''}`}
          onClick={() => navigate(item.to)}
          aria-label={item.label}
        >
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
