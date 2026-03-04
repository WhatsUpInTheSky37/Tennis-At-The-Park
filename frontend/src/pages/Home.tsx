import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { api } from '../api/client'
import { Card, Button, Badge, Spinner } from '../components/ui'
import { PageContainer, PublicCourtDisclaimer } from '../components/layout/Layout'
import { format } from 'date-fns'

export default function HomePage() {
  const { user, locations } = useStore()
  const navigate = useNavigate()
  const [todaySessions, setTodaySessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    api.getSessions({ date: today })
      .then(setTodaySessions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--court-mid) 0%, var(--court-light) 100%)',
        borderBottom: '2px solid var(--baseline)',
        padding: '32px 16px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Court lines decoration */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `
            linear-gradient(to right, #fff 1px, transparent 1px),
            linear-gradient(to bottom, #fff 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }} />

        <PageContainer>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: '13px', color: 'var(--baseline)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
              🎾 Community Court Coordinator
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(44px, 10vw, 72px)',
              letterSpacing: '0.04em',
              lineHeight: 0.95,
              marginBottom: '16px',
            }}>
              FIND YOUR<br />
              <span style={{ color: 'var(--baseline)' }}>NEXT MATCH</span>
            </h1>
            <p style={{ color: 'var(--text-dim)', fontSize: '16px', maxWidth: '480px', marginBottom: '24px' }}>
              Connect with players, plan sessions at City Park & Winterplace Park, and track your Elo rating. No install needed — works in your browser.
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {user ? (
                <>
                  <Button size="lg" onClick={() => navigate('/match-finder')}>🔍 Find Match</Button>
                  <Button size="lg" variant="outline" onClick={() => navigate('/sessions/new')}>📅 Plan Session</Button>
                  <Button size="lg" variant="secondary" onClick={() => navigate('/record')}>🎾 Record Match</Button>
                </>
              ) : (
                <>
                  <Button size="lg" onClick={() => navigate('/register')}>Create Profile — Free</Button>
                  <Button size="lg" variant="outline" onClick={() => navigate('/sessions')}>Browse Sessions</Button>
                </>
              )}
            </div>
          </div>
        </PageContainer>
      </div>

      <PageContainer style={{ paddingTop: '24px', paddingBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Public court disclaimer */}
          <PublicCourtDisclaimer />

          {/* Today's community schedule */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '0.04em' }}>
                COMMUNITY SCHEDULE TODAY
              </h2>
              <Link to="/sessions" style={{ fontSize: '13px', color: 'var(--baseline)', fontWeight: 600 }}>View all →</Link>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                <Spinner />
              </div>
            ) : todaySessions.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '32px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌅</div>
                <div style={{ color: 'var(--text-dim)', marginBottom: '12px' }}>No sessions planned for today yet.</div>
                {user && <Button onClick={() => navigate('/sessions/new')}>Plan the first session!</Button>}
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {todaySessions.slice(0, 5).map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
                {todaySessions.length > 5 && (
                  <Link to="/sessions" style={{ textAlign: 'center', color: 'var(--baseline)', fontWeight: 600, display: 'block', padding: '8px' }}>
                    +{todaySessions.length - 5} more sessions today
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Courts info */}
          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '0.04em', marginBottom: '12px' }}>
              OUR COURTS
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {locations.map((loc) => (
                <Card key={loc.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '16px' }}>{loc.name}</strong>
                    <Badge variant={loc.lighted ? 'success' : 'warn'}>
                      {loc.lighted ? '💡 Lighted' : '🌑 No lights'}
                    </Badge>
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
                    {loc.courtCount} courts · {loc.lighted ? 'Night play OK' : 'Daytime only recommended'}
                  </div>
                  {loc.address && <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{loc.address}</div>}
                </Card>
              ))}
            </div>
          </section>

          {/* Quick links */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            {[
              { to: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
              { to: '/rules', icon: '📖', label: 'Community Rules' },
              { to: '/players', icon: '👥', label: 'Players' },
              ...(user?.isAdmin ? [{ to: '/admin', icon: '⚙️', label: 'Admin' }] : []),
            ].map((item) => (
              <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
                <Card hoverable style={{ textAlign: 'center', padding: '16px 8px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{item.icon}</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dim)' }}>{item.label}</div>
                </Card>
              </Link>
            ))}
          </section>
        </div>
      </PageContainer>
    </div>
  )
}

function SessionCard({ session }: { session: any }) {
  const navigate = useNavigate()
  const formatMap: Record<string, string> = { singles: 'Singles', doubles: 'Doubles', mixed_doubles: 'Mixed', practice: 'Practice' }

  return (
    <Card hoverable onClick={() => navigate(`/sessions/${session.id}`)} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <div style={{
        background: 'var(--baseline-dim)',
        border: '1px solid var(--baseline)',
        borderRadius: 'var(--radius)',
        padding: '8px',
        textAlign: 'center',
        minWidth: '60px',
        flexShrink: 0,
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--baseline)', lineHeight: 1 }}>
          {format(new Date(session.startTime), 'h:mm')}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--baseline)', letterSpacing: '0.06em' }}>
          {format(new Date(session.startTime), 'a')}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '15px' }}>{session.location?.name}</strong>
          {session.courtNumber && <Badge>{`Court ${session.courtNumber}`}</Badge>}
          {!session.courtNumber && <Badge variant="info">Flexible court</Badge>}
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '2px' }}>
          {formatMap[session.format] || session.format} ·{' '}
          NTRP {session.levelMin}–{session.levelMax} ·{' '}
          {session.creator?.profile?.displayName}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
        {!session.location?.lighted && (
          <span style={{ fontSize: '16px' }} title="Not lighted">🌑</span>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          {session.participants?.length || 0} joined
        </span>
      </div>
    </Card>
  )
}
