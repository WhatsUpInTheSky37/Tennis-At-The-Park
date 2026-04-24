import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { getInitials } from '../lib/utils'

export default function MobileHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null

  return (
    <div className="mobile-header">
      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <img src="/tennis-at-the-park.png" alt="Tennis at the Park" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link to="/profile" className="avatar" title="Edit Profile" style={{ width: 30, height: 30, fontSize: 11 }}>
          {user.profile?.photoUrl
            ? <img src={user.profile.photoUrl} alt="" />
            : getInitials(user.displayName || user.email)
          }
        </Link>
        <button className="btn btn-ghost btn-sm sign-out-btn" onClick={() => { logout(); navigate('/') }}>
          Sign Out
        </button>
      </div>
    </div>
  )
}
