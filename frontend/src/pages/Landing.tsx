import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

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
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/auth')}>
            Create Free Profile
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => navigate('/auth')}>
            Sign In
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 24 }}>
          {[
            { icon: '📍', title: 'City Park Courts', sub: '4 courts · 💡 Lighted', address: '127 N Park Dr, Salisbury, MD 21804' },
            { icon: '📍', title: 'Winterplace Park', sub: '2 courts · 🌙 Daylight only', address: '737 Blue Ribbon Rd, Salisbury, MD 21804' },
          ].map(loc => (
            <div key={loc.title} className="card">
              <div style={{ fontSize: 24, marginBottom: 8 }}>{loc.icon}</div>
              <div className="font-bold">{loc.title}</div>
              <div className="text-sm text-muted">{loc.sub}</div>
              <div className="text-sm text-muted" style={{ marginTop: 4, fontSize: '0.75rem' }}>{loc.address}</div>
            </div>
          ))}
        </div>

        <div className="disclaimer" style={{ marginTop: 24, textAlign: 'center' }}>
          <strong>⚠️ Public Courts:</strong> This app coordinates meetups only. Courts are first-come/rotation-based. No reservations.
        </div>

        <div style={{ marginTop: 32 }}>
          <div className="card" style={{ textAlign: 'left', padding: 24 }}>
            <h3 style={{ marginBottom: 16, textAlign: 'center', fontFamily: 'var(--font-display)', letterSpacing: 2 }}>
              Court Etiquette
            </h3>
            <ul style={{ listStyle: 'disc', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>Arrive on time for matches</li>
              <li>Use warm-ups to rally, not compete</li>
              <li>Make fair and honest line calls</li>
              <li>Respect nearby courts and players</li>
              <li>Return balls that roll onto your court</li>
              <li>Follow court time limits if others are waiting</li>
              <li>Show good sportsmanship</li>
              <li>Clean up after your match</li>
              <li>Record match scores honestly</li>
            </ul>
            <p style={{ marginTop: 16, textAlign: 'center', fontStyle: 'italic', color: 'var(--color-primary)' }}>
              Let's build a great tennis community in Salisbury.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/courts')}>
            List of Courts
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/rules')}>
            Court Etiquette Rules
          </button>
        </div>
      </div>
    </div>
  )
}
