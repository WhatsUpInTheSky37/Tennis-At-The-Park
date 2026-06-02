import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { formatDistanceToNow, format } from 'date-fns'

function ymd(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function Landing() {
  const navigate = useNavigate()
  const [recentPosts, setRecentPosts] = useState<any[]>([])
  const [weekSessions, setWeekSessions] = useState<any[]>([])
  const [latestArticles, setLatestArticles] = useState<any[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])

  useEffect(() => {
    api.getRecentForumPosts().then(setRecentPosts).catch(() => {})
    const today = new Date()
    const weekOut = new Date(); weekOut.setDate(weekOut.getDate() + 6)
    api.getSessions({ date: ymd(today), dateTo: ymd(weekOut) })
      .then(s => setWeekSessions((s || []).slice(0, 4)))
      .catch(() => {})
    api.getLatestArticles().then(setLatestArticles).catch(() => {})
    api.getChallengeEvents().then(evs => {
      const now = Date.now()
      const upcoming = (evs || [])
        .filter((e: any) => e.status !== 'completed' && new Date(e.endTime || e.date).getTime() > now - 12 * 3600 * 1000)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 2)
      setUpcomingEvents(upcoming)
    }).catch(() => {})
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
          Find a tennis game in Salisbury this week.
        </p>

        <div style={{ textAlign: 'center', margin: '12px auto 24px', maxWidth: 640 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 7vw, 44px)', letterSpacing: 3, color: '#fff', textShadow: '0 0 18px rgba(74,222,128,0.45)' }}>
            Game on, neighbors.
          </div>
        </div>

        <div className="hero-actions">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/auth?mode=register')}>
            Free Signup
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => navigate('/auth')}>
            Sign In
          </button>
        </div>

        {/* Saturday Summer Challenge flyer */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <img
            src="/summer-challenge-flyer.jpg"
            alt="Saturday Summer Challenge — Saturday June 13 at City Park Courts, Salisbury MD. Singles in the morning (Americano), Doubles in the afternoon (Mexicano)."
            onClick={() => navigate('/auth?mode=register')}
            onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
            style={{
              width: '100%', maxWidth: 560, height: 'auto', display: 'inline-block',
              borderRadius: 14, border: '1px solid var(--border2)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.45)', cursor: 'pointer'
            }}
          />
        </div>

        {/* Saturday Summer Challenge — advertisement for logged-out visitors */}
        {upcomingEvents.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div
              className="card"
              style={{
                padding: 24,
                background: '#000',
                border: '1px solid var(--accent)',
                boxShadow: '0 0 22px rgba(127,254,74,0.18)',
                color: 'var(--text)',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 6 }}>🏆</div>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', letterSpacing: 2, color: 'var(--accent)', fontSize: 'clamp(20px, 5vw, 28px)' }}>
                SATURDAY SUMMER CHALLENGE
              </h3>
              <p style={{ margin: '8px auto 16px', maxWidth: 520, color: 'var(--text2)' }}>
                Fast singles &amp; doubles matches with live standings — come rotate through the courts with the neighborhood. Free to play.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520, margin: '0 auto 18px' }}>
                {upcomingEvents.map(e => (
                  <div
                    key={e.id}
                    style={{
                      background: '#0e1116',
                      border: '1px solid rgba(127,254,74,0.18)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{e.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
                      📍 {e.location?.name} · 📅 {format(new Date(e.date), 'EEE, MMM d')} · 🕐 {format(new Date(e.date), 'h:mm a')}
                      {e.endTime ? ` – ${format(new Date(e.endTime), 'h:mm a')}` : ''}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
                      {e.format} · {e._count?.participants ?? 0} player{(e._count?.participants ?? 0) === 1 ? '' : 's'} signed up
                    </div>
                  </div>
                ))}
              </div>

              <button
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/auth?mode=register')}
              >
                Create an Account &amp; Sign Up →
              </button>
              <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text2)' }}>
                Already have an account?{' '}
                <span style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 700, color: 'var(--accent)' }} onClick={() => navigate('/auth')}>
                  Sign in to join
                </span>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 28 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 2, fontSize: 20, margin: 0 }}>
              THIS WEEK'S GAMES
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/auth?mode=register')}>
              See all →
            </button>
          </div>
          {weekSessions.length === 0 ? (
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>🎾</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>No games on the books yet this week.</div>
              <div className="text-sm text-muted" style={{ marginBottom: 12 }}>
                Be the one who makes it happen — set a time at City Park or Winterplace and players will show.
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth?mode=register')}>
                Plan a Session
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {weekSessions.map((s: any) => {
                const filled = s.participants?.length || 0
                const cap = s.maxPlayers || (s.format?.includes('doubles') ? 4 : 2)
                const spotsLeft = Math.max(0, cap - filled)
                return (
                  <div
                    key={s.id}
                    className="card"
                    style={{ cursor: 'pointer', padding: 14 }}
                    onClick={() => navigate(`/sessions/${s.id}`)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, marginBottom: 2 }}>
                          {format(new Date(s.startTime), 'EEE, MMM d · h:mm a')}
                        </div>
                        <div className="text-sm text-muted">
                          {s.location?.name}
                          {s.format ? ` · ${s.format}` : ''}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 12,
                        background: spotsLeft > 0 ? 'var(--accent-dim)' : 'var(--gray-100, #eee)',
                        color: spotsLeft > 0 ? 'var(--accent)' : 'var(--text3, #888)',
                        whiteSpace: 'nowrap',
                      }}>
                        {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} open` : 'Full'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {latestArticles.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 2, fontSize: 20, margin: 0 }}>LATEST ARTICLES</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/articles')}>View All →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {latestArticles.slice(0, 4).map(a => (
                <div
                  key={a.id}
                  className="card"
                  style={{ cursor: 'pointer', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                  onClick={() => navigate(`/articles/${a.slug}`)}
                >
                  {a.coverImage && (
                    <img src={a.coverImage} alt="" style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                  )}
                  <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>{a.title}</div>
                    {a.excerpt && (
                      <div className="text-sm text-muted" style={{
                        flex: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {a.excerpt}
                      </div>
                    )}
                    <div className="text-xs text-muted" style={{ marginTop: 8 }}>
                      {a.publishedAt && format(new Date(a.publishedAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

        <div className="card" style={{ marginTop: 24, padding: 24, textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/auth?mode=register')}>
          <h3 style={{ marginBottom: 8, fontFamily: 'var(--font-display)', letterSpacing: 2, color: '#fff' }}>
            Coaches & Instructors Welcome
          </h3>
          <p style={{ margin: 0, color: '#fff' }}>
            Already a trainer? Flip the <strong>"I'm a Tennis Instructor"</strong> toggle on your profile
            and you'll show up when local players search for lessons — complete with your skill level,
            availability, and contact info. No ads, no fees, no extra signup.
          </p>
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

        <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text3)' }}>
          Copyright 2026 · Will Farrar · Find me at{' '}
          <a href="https://www.willfarrar.net" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>www.willfarrar.net</a>
          <p style={{ marginTop: 12, fontSize: '0.7rem', lineHeight: 1.5, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto', color: 'var(--text3)' }}>
            <strong>Disclaimer:</strong> Tennis at the Park is an independent community group and is
            not affiliated with, endorsed by, sponsored by, or otherwise associated with the City of
            Salisbury, Wicomico County, their respective Departments of Parks and Recreation, or any
            other governmental entity. All play takes place on public tennis courts on a first-come,
            first-served basis in accordance with the posted rules and policies of the applicable park.
            This platform is provided solely to help players coordinate informal meetups and does not
            reserve, control, manage, or guarantee access to any court or facility.
          </p>
        </div>
      </div>
    </div>
  )
}
