import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { getInitials } from '../lib/utils'
import { api } from '../lib/api'

export default function TopNav() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [unreadDms, setUnreadDms] = useState(0)

  useEffect(() => {
    if (!user) return
    const load = () => api.getUnreadDmCount().then(r => setUnreadDms(r.count)).catch(() => {})
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [user])

  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/activity', label: 'Activity' },
    { to: '/players', label: 'Find Players' },
    { to: '/messages', label: 'Messages', badge: unreadDms },
    { to: '/forum', label: 'Forum' },
  ]

  return (
    <nav className="top-nav">
      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
        <img src="/tennis-at-the-park.png" alt="Tennis at the Park" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
      </Link>
      <div className="nav-links">
        {links.map(l => (
          <Link key={l.to} to={l.to} className={`nav-link ${location.pathname.startsWith(l.to) ? 'active' : ''}`} style={{ position: 'relative' }}>
            {l.label}
            {l.badge && l.badge > 0 ? (
              <span style={{
                position: 'absolute', top: -4, right: -10,
                background: 'var(--red)', color: '#fff', borderRadius: '50%',
                width: 18, height: 18, fontSize: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontWeight: 700,
              }}>
                {l.badge > 9 ? '9+' : l.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
      <div className="nav-actions">
        {user ? (
          <>
            <Link to="/sessions/new" className="btn btn-primary btn-sm hide-mobile">+ Plan Session</Link>
            <Link to="/profile" className="avatar" title="Edit Profile" style={{ width: 36, height: 36, fontSize: 13 }}>
              {user.profile?.photoUrl
                ? <img src={user.profile.photoUrl} alt="" />
                : getInitials(user.displayName || user.email)
              }
            </Link>
            <button className="btn btn-ghost btn-sm sign-out-btn" onClick={() => { logout(); navigate('/') }} title="Sign Out">
              Sign Out
            </button>
          </>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth')}>Sign In</button>
        )}
      </div>
    </nav>
  )
}
