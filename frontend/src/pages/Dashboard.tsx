import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { api } from '../lib/api'
import SessionCard from '../components/SessionCard'
import DisclaimerBox from '../components/DisclaimerBox'
import { format, addDays, formatDistanceToNow } from 'date-fns'
import { formatDateTime, formatTime, getInitials } from '../lib/utils'
import SkillDisplay from '../components/SkillDisplay'
import { Link } from 'react-router-dom'

const PAGE_SIZE = 5

export default function Dashboard() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<any[]>([])
  const [pendingChallenges, setPendingChallenges] = useState<any[]>([])
  const [lookingToPlay, setLookingToPlay] = useState(false)
  const [loading, setLoading] = useState(true)
  const [challengeActionLoading, setChallengeActionLoading] = useState<string | null>(null)
  const [myPage, setMyPage] = useState(0)
  const [communityPage, setCommunityPage] = useState(0)
  const [recentPosts, setRecentPosts] = useState<any[]>([])

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const endOfWeek = format(addDays(new Date(), 6), 'yyyy-MM-dd')
    api.getSessions({ date: today, dateTo: endOfWeek }).then(s => { setSessions(s); setLoading(false) })
    api.getChallenges({ direction: 'received', status: 'pending' })
      .then(setPendingChallenges)
      .catch(() => {})
    api.getRecentForumPosts().then(setRecentPosts).catch(() => {})
    if (user) setLookingToPlay(user.profile?.lookingToPlay || false)
  }, [])

  const handleAcceptChallenge = async (id: string) => {
    setChallengeActionLoading(id)
    try {
      await api.acceptChallenge(id)
      setPendingChallenges(prev => prev.filter(c => c.id !== id))
    } finally { setChallengeActionLoading(null) }
  }

  const toggleLookingToPlay = async () => {
    const next = !lookingToPlay
    setLookingToPlay(next)
    await api.updateMyProfile({ lookingToPlay: next })
    refresh()
  }

  const mySessions = sessions.filter(s => s.participants?.some((p: any) => p.userId === user?.id))
  const communitySessions = sessions.filter(s => !s.participants?.some((p: any) => p.userId === user?.id))

  const myPagedSessions = mySessions.slice(myPage * PAGE_SIZE, (myPage + 1) * PAGE_SIZE)
  const myTotalPages = Math.ceil(mySessions.length / PAGE_SIZE)

  const communityPagedSessions = communitySessions.slice(communityPage * PAGE_SIZE, (communityPage + 1) * PAGE_SIZE)
  const communityTotalPages = Math.ceil(communitySessions.length / PAGE_SIZE)

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">DASHBOARD</h1>
          <p className="page-subtitle">Today, {format(new Date(), 'EEEE MMMM d')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/sessions/new')}>+ Plan Session</button>
      </div>

      {/* Looking to Play Toggle */}
      <div
        className={`ltp-toggle mb-4 ${lookingToPlay ? 'active' : ''}`}
        onClick={toggleLookingToPlay}
        role="button"
        tabIndex={0}
        aria-label="Toggle looking to play"
        style={{ maxWidth: 400 }}
      >
        <div className={`toggle-switch ${lookingToPlay ? 'on' : ''}`} />
        <div>
          <div className="font-bold">{lookingToPlay ? '🟢 Looking to Play' : '⚪ Available to Play'}</div>
          <div className="text-xs text-muted">Let others know you want a game today</div>
        </div>
      </div>

      <DisclaimerBox showRotation />

      {/* Quick Actions */}
      <div className="grid-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
        <button className="card clickable text-center" style={{ background: 'var(--green-700)', color: 'white', borderColor: 'var(--green-700)' }} onClick={() => navigate('/sessions/new')}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>&#128197;</div>
          <div className="font-bold text-sm" style={{ color: 'white' }}>Plan Session</div>
        </button>
        <button className="card clickable text-center" style={{ background: 'var(--green-700)', color: 'white', borderColor: 'var(--green-700)' }} onClick={() => navigate('/matches/record')}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>&#127942;</div>
          <div className="font-bold text-sm" style={{ color: 'white' }}>Record Match</div>
        </button>
        <button className="card clickable text-center" style={{ background: 'var(--green-700)', color: 'white', borderColor: 'var(--green-700)' }} onClick={() => navigate('/players')}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>&#128101;</div>
          <div className="font-bold text-sm" style={{ color: 'white' }}>Find Players</div>
        </button>
        <button className="card clickable text-center" style={{ background: 'var(--green-700)', color: 'white', borderColor: 'var(--green-700)', position: 'relative' }} onClick={() => navigate('/challenges')}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>&#9876;&#65039;</div>
          <div className="font-bold text-sm" style={{ color: 'white' }}>Challenges</div>
          {pendingChallenges.length > 0 && (
            <span style={{
              position: 'absolute', top: 6, right: 6,
              background: 'var(--red)', color: '#fff', borderRadius: '50%',
              width: 20, height: 20, fontSize: 11, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontWeight: 700
            }}>
              {pendingChallenges.length}
            </span>
          )}
        </button>
      </div>

      {/* Pending Challenges */}
      {pendingChallenges.length > 0 && (
        <div className="section mb-4">
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            &#9876;&#65039; INCOMING CHALLENGES
            <span style={{
              background: 'var(--red)', color: '#fff', borderRadius: 12,
              padding: '2px 8px', fontSize: 12, fontWeight: 700
            }}>
              {pendingChallenges.length}
            </span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingChallenges.slice(0, 3).map(c => (
              <div key={c.id} className="card" style={{ borderLeft: '4px solid var(--orange)' }}>
                <div className="flex gap-3 items-center mb-2">
                  <div className="avatar" style={{ width: 40, height: 40, fontSize: 16, background: 'var(--accent-dim)' }}>
                    {c.challenger?.profile?.photoUrl
                      ? <img src={c.challenger.profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : getInitials(c.challenger?.profile?.displayName || '?')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="font-bold text-sm">{c.challenger?.profile?.displayName} challenged you</div>
                    <div className="text-xs text-muted">
                      {c.format} &#183; {formatDateTime(c.proposedTime)} &#183; {c.location?.name}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAcceptChallenge(c.id)}
                      disabled={challengeActionLoading === c.id}
                    >
                      Accept
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate('/challenges')}
                    >
                      View
                    </button>
                  </div>
                </div>
                {c.message && (
                  <p className="text-xs text-muted" style={{ background: 'var(--bg3)', padding: '4px 8px', borderRadius: 4 }}>
                    "{c.message}"
                  </p>
                )}
              </div>
            ))}
            {pendingChallenges.length > 3 && (
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/challenges')}>
                View all {pendingChallenges.length} challenges &#8594;
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats snapshot — no Elo */}
      {user?.rating && (
        <div className="card mb-4" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="text-sm text-muted" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>W/L: <strong className="text-accent">{user.rating.wins}</strong> / <strong className="text-red">{user.rating.losses}</strong></div>
            <div>Streak: <strong>{user.rating.currentStreak} 🔥</strong></div>
            <div>Matches: <strong>{user.rating.matchesPlayed}</strong></div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leaderboards')}>View Rankings →</button>
        </div>
      )}

      <div className="section">
        <h2 className="section-title">MY SCHEDULE THIS WEEK</h2>
        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : mySessions.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🎾</div>
            <h3>No sessions planned this week</h3>
            <button className="btn btn-primary mt-4" onClick={() => navigate('/sessions/new')}>Plan a Session</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {myPagedSessions.map(s => <SessionCard key={s.id} session={s} />)}
            {myTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-2">
                {myPage > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setMyPage(p => p - 1)}>
                    ← Previous
                  </button>
                )}
                <span className="text-sm text-muted">
                  {myPage + 1} of {myTotalPages}
                </span>
                {myPage < myTotalPages - 1 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setMyPage(p => p + 1)}>
                    Next →
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="section">
        <h2 className="section-title">COMMUNITY SCHEDULE THIS WEEK</h2>
        {communitySessions.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📅</div>
            <h3>No other sessions this week</h3>
            <button className="btn btn-ghost mt-4" onClick={() => navigate('/activity')}>View All Activity</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {communityPagedSessions.map(s => <SessionCard key={s.id} session={s} />)}
            {communityTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-2">
                {communityPage > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setCommunityPage(p => p - 1)}>
                    ← Previous
                  </button>
                )}
                <span className="text-sm text-muted">
                  {communityPage + 1} of {communityTotalPages}
                </span>
                {communityPage < communityTotalPages - 1 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setCommunityPage(p => p + 1)}>
                    Next →
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {recentPosts.length > 0 && (
        <div className="section">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title" style={{ margin: 0 }}>FORUM</h2>
            <Link to="/forum" className="btn btn-ghost btn-sm">View All →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentPosts.map(p => (
              <Link key={p.id} to={`/forum/${p.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ cursor: 'pointer', padding: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{p.subject}</div>
                  <div className="text-xs text-muted">
                    {p.author?.profile?.displayName} · {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })} · {p._count?.replies || 0} replies
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
