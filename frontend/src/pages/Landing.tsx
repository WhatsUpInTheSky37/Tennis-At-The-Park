import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="hero">
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 700 }}>

        {/* Giant logo ball */}
        <div className="landing-ball-wrap">
          <img
            src="/tennis-at-the-park.png"
            alt="Tennis at the Park"
            className="landing-ball"
          />
        </div>

        {/* Feature words */}
        <div className="landing-features">
          <span className="landing-feature">FIND PLAYERS</span>
          <span className="landing-feature-dot" />
          <span className="landing-feature">PLAN MEETUPS</span>
          <span className="landing-feature-dot" />
          <span className="landing-feature">TRACK YOUR GAME</span>
          <span className="landing-feature-dot" />
          <span className="landing-feature landing-feature-accent">LOCAL</span>
        </div>

        <p style={{
          textAlign: 'center',
          color: 'var(--text3)',
          fontSize: 'clamp(13px, 2.5vw, 16px)',
          marginTop: 12,
          marginBottom: 32,
          letterSpacing: 0.5,
        }}>
          Your community tennis hub in Salisbury, MD
        </p>

        {/* Single CTA */}
        {!user ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
            <button
              className="btn btn-primary btn-lg"
              style={{ minWidth: 260, fontSize: 16, padding: '14px 32px' }}
              onClick={() => navigate('/auth')}
            >
              Sign In / Create Account
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
            <button
              className="btn btn-primary btn-lg"
              style={{ minWidth: 220, fontSize: 16, padding: '14px 32px' }}
              onClick={() => navigate('/sessions')}
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Info badges */}
        <div className="flex gap-3 justify-center flex-wrap mb-6">
          <div className="hero-badge">📱 No install needed</div>
          <div className="hero-badge">🔓 Free to join</div>
          <div className="hero-badge">🎾 Community-driven</div>
        </div>

        {/* Court locations */}
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
      </div>
    </div>
  )
}
