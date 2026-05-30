import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { getInitials } from '../lib/utils'

export default function MobileHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  if (!user) return null

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: '⌂' },
    { to: '/activity', label: 'Activity', icon: '🎾' },
    { to: '/challenge-events', label: 'Events', icon: '🏆' },
    { to: '/players', label: 'Find Players', icon: '👥' },
    { to: '/challenges', label: 'Challenges', icon: '⚔️' },
    { to: '/calendar', label: 'Calendar', icon: '📅' },
    { to: '/leaderboards', label: 'Leaderboards', icon: '📊' },
    { to: '/forum', label: 'Forum', icon: '💬' },
    { to: '/articles', label: 'Articles', icon: '📰' },
    { to: '/messages', label: 'Messages', icon: '✉️' },
    { to: '/notifications', label: 'Notifications', icon: '🔔' },
    { to: '/profile', label: 'My Profile', icon: '👤' },
  ]
  if (user.isAdmin) links.push({ to: '/admin', label: 'Admin', icon: '🛠️' })

  return (
    <div className="mobile-header">
      <button
        aria-label="Menu"
        onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 24, lineHeight: 1, padding: 4, cursor: 'pointer', flexShrink: 0 }}
      >
        {open ? '✕' : '☰'}
      </button>

      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }} onClick={() => setOpen(false)}>
        <img src="/tennis-at-the-park.png" alt="Tennis at the Park" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link to="/profile" className="avatar" title="Edit Profile" style={{ width: 30, height: 30, fontSize: 11 }} onClick={() => setOpen(false)}>
          {user.profile?.photoUrl
            ? <img src={user.profile.photoUrl} alt="" />
            : getInitials(user.displayName || user.email)
          }
        </Link>
        <button className="btn btn-ghost btn-sm sign-out-btn" onClick={() => { logout(); navigate('/') }}>
          Sign Out
        </button>
      </div>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, top: 52, background: 'rgba(0,0,0,0.5)', zIndex: 199 }}
          />
          <nav style={{
            position: 'fixed', top: 52, left: 0, right: 0, zIndex: 200,
            background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
            maxHeight: 'calc(100vh - 52px)', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', padding: 8
          }}>
            {links.map(l => {
              const active = location.pathname.startsWith(l.to)
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 12px', borderRadius: 8, textDecoration: 'none',
                    fontSize: 16, fontWeight: 600,
                    color: active ? 'var(--accent)' : 'var(--text)',
                    background: active ? 'var(--accent-dim)' : 'transparent'
                  }}
                >
                  <span style={{ fontSize: 20, width: 24, textAlign: 'center' }}>{l.icon}</span>
                  {l.label}
                </Link>
              )
            })}
          </nav>
        </>
      )}
    </div>
  )
}
