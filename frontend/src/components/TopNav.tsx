import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { getInitials } from '../lib/utils'

export default function TopNav() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/sessions', label: 'Schedule' },
    { to: '/players', label: 'Find Players' },
    { to: '/matches', label: 'Matches' },
    { to: '/leaderboards', label: 'Rankings' },
  ]

  return (
    <nav className="top-nav">
      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <img src="/tennis-at-the-park.png" alt="Tennis at the Park" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
        <span className="nav-logo" style={{ fontSize: 20 }}>TENNIS AT THE PARK</span>
      </Link>
      <div className="nav-links">
        {links.map(l => (
          <Link key={l.to} to={l.to} className={`nav-link ${location.pathname.startsWith(l.to) ? 'active' : ''}`}>
            {l.label}
          </Link>
        ))}
      </div>
      <div className="nav-actions">
        {user ? (
          <>
            <Link to="/sessions/new" className="btn btn-primary btn-sm">+ Plan Session</Link>
            <Link to="/profile" className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
              {user.profile?.photoUrl
                ? <img src={user.profile.photoUrl} alt="" />
                : getInitials(user.displayName || user.email)
              }
            </Link>
          </>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth')}>Sign In</button>
        )}
      </div>
    </nav>
  )
}
