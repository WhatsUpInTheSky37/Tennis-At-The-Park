import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { getInitials, formatSkill } from '../lib/utils'

export default function Leaderboards() {
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [tab, setTab] = useState<'wins' | 'streak' | 'matches'>('wins')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getLeaderboards().then(d => { setData(d); setLoading(false) })
  }, [])

  const entries = {
    wins: data?.byWins || [],
    streak: data?.byStreak || [],
    matches: data?.byElo || []
  }[tab]

  const getValue = (r: any) => {
    if (tab === 'wins') return `${r.wins} W`
    if (tab === 'streak') return `${r.currentStreak} 🔥`
    return `${r.matchesPlayed} played`
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">RANKINGS</h1>
        <p className="page-subtitle">Community leaderboards</p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'wins' ? 'active' : ''}`} onClick={() => setTab('wins')}>Most Wins</button>
        <button className={`tab ${tab === 'streak' ? 'active' : ''}`} onClick={() => setTab('streak')}>Win Streak</button>
        <button className={`tab ${tab === 'matches' ? 'active' : ''}`} onClick={() => setTab('matches')}>Most Active</button>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : entries.length === 0 ? (
        <div className="empty-state"><div className="icon">📊</div><h3>No data yet</h3></div>
      ) : (
        <div className="card">
          {entries.map((r: any, i: number) => (
            <div key={r.userId} className="lb-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${r.userId}`)}>
              <div className={`lb-rank ${i < 3 ? 'top3' : ''}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </div>
              <div className="avatar" style={{ width: 36, height: 36, fontSize: 14, background: 'var(--bg3)' }}>
                {r.user?.profile?.photoUrl
                  ? <img src={r.user.profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : getInitials(r.user?.profile?.displayName || '?')
                }
              </div>
              <div style={{ flex: 1 }}>
                <div className="font-bold">{r.user?.profile?.displayName}</div>
                <div className="text-xs text-muted">
                  NTRP {formatSkill(r.user?.profile?.skillLevel || 3)} · {r.wins}W {r.losses}L
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--accent)' }}>
                {getValue(r)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
