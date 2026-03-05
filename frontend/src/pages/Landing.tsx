import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const go = (path: string) => {
    if (!user) navigate('/auth', { state: { redirect: path } })
    else navigate(path)
  }

  return (
    <div className="hero">
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 700 }}>
        {/* Hero banner card — logo fills the full width */}
        <div className="landing-banner">
          <img
            src="/tennis-at-the-park.png"
            alt="Tennis at the Park"
            className="landing-banner-img"
          />
          <div className="landing-banner-overlay">
            <div className="hero-logo" style={{ fontSize: 'clamp(32px, 9vw, 64px)', letterSpacing: 4 }}>
              TENNIS AT THE PARK
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(13px, 3vw, 18px)', letterSpacing: 3, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
              SALISBURY, MD
            </div>
          </div>
        </div>

        <p className="hero-tagline" style={{ maxWidth: '100%' }}>
          Find players, plan meetups, track your game — at your local public courts.
        </p>

        <div className="hero-actions">
          <button className="btn btn-primary btn-lg" onClick={() => go('/sessions')}>
            📅 View Community Schedule
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => go('/players')}>
            👥 Find Players
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => go('/matches/record')}>
            🏆 Record a Match
          </button>
        </div>

        <div className="flex gap-3 justify-center flex-wrap mb-6">
          <div className="hero-badge">📱 No install needed — use in your browser</div>
          <div className="hero-badge">🔓 Free to join</div>
          <div className="hero-badge">🎾 Community-driven</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 24 }}>
          {[
            { icon: '📍', title: 'City Park Courts', sub: '4 courts · 💡 Lighted' },
            { icon: '📍', title: 'Winterplace Park', sub: '2 courts · 🌙 Daylight only' },
          ].map(loc => (
            <div key={loc.title} className="card">
              <div style={{ fontSize: 24, marginBottom: 8 }}>{loc.icon}</div>
              <div className="font-bold">{loc.title}</div>
              <div className="text-sm text-muted">{loc.sub}</div>
            </div>
          ))}
        </div>

        <div className="disclaimer" style={{ marginTop: 24, textAlign: 'center' }}>
          <strong>⚠️ Public Courts:</strong> This app coordinates meetups only. Courts are first-come/rotation-based. No reservations.
        </div>

        {!user && (
          <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate('/auth')}>
              Create Profile & Get Started
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/rules')}>
              View Community Rules
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
