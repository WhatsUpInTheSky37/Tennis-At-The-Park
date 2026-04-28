import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { formatDistanceToNow } from 'date-fns'

export default function Landing() {
  const navigate = useNavigate()
  const [recentPosts, setRecentPosts] = useState<any[]>([])

  useEffect(() => {
    api.getRecentForumPosts().then(setRecentPosts).catch(() => {})
  }, [])

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
          Connecting Salisbury's tennis community — one match at a time.
        </p>

        <div style={{ textAlign: 'center', margin: '8px auto 20px', maxWidth: 560 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 4.5vw, 28px)', letterSpacing: 2, color: 'var(--color-primary)' }}>
            Game on, neighbors.
          </div>
          <div style={{ marginTop: 6, fontSize: 'clamp(14px, 2.5vw, 16px)', color: 'var(--color-text-muted, #555)' }}>
            Talk tennis, find partners, and share a little friendly rivalry along the way.
          </div>
        </div>

        <div className="hero-actions">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/auth?mode=register')}>
            Create Free Profile
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => navigate('/auth')}>
            Sign In
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 24 }}>
          {[
            { img: '/city-park.jpg', title: 'City Park', address: '127 N Park Dr, Salisbury, MD', sub: '4 courts · Lighted' },
            { img: '/winterplace-park.jpg', title: 'Winterplace Park', address: '737 Blue Ribbon Rd, Salisbury, MD', sub: '2 courts · Daylight only' },
          ].map(loc => (
            <div key={loc.title} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <img src={loc.img} alt={loc.title} style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '16px 18px 20px' }}>
                <div className="font-bold" style={{ fontSize: '1.1rem', marginBottom: 4 }}>{loc.title}</div>
                <div className="text-sm text-muted">{loc.address}</div>
                <div className="text-sm" style={{ marginTop: 6 }}>{loc.sub}</div>
              </div>
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

        {recentPosts.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 2, fontSize: 20 }}>FORUM</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/forum')}>View All →</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentPosts.map(p => (
                <div key={p.id} className="card" style={{ cursor: 'pointer', padding: 14 }} onClick={() => navigate(`/forum/${p.id}`)}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{p.subject}</div>
                  <div className="text-xs text-muted">
                    {p.author?.profile?.displayName} · {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })} · {p._count?.replies || 0} replies
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/rules')}>
            Court Etiquette Rules
          </button>
        </div>
      </div>
    </div>
  )
}
