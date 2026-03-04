import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { getInitials, formatSkill, skillLabel } from '../lib/utils'
import SkillDisplay from '../components/SkillDisplay'

export default function FindPlayers() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [skillFilter, setSkillFilter] = useState('')

  useEffect(() => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (skillFilter) params.skill = skillFilter
    setLoading(true)
    api.getPlayers(params).then(p => { setPlayers(p); setLoading(false) })
  }, [search, skillFilter])

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">FIND PLAYERS</h1>
        <p className="page-subtitle">Players currently looking to play</p>
      </div>

      <div className="card mb-4" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          placeholder="🔍 Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 160 }}
        />
        <select value={skillFilter} onChange={e => setSkillFilter(e.target.value)} style={{ width: 160 }}>
          <option value="">All skill levels</option>
          {[2,3,3.5,4,4.5,5].map(v => <option key={v} value={v}>~{v} NTRP</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : players.length === 0 ? (
        <div className="empty-state">
          <div className="icon">👥</div>
          <h3>No players found</h3>
          <p>Try changing the filters, or enable "Looking to Play" on your profile!</p>
        </div>
      ) : (
        <div className="grid-2">
          {players.map(p => (
            <div key={p.userId} className="card clickable" onClick={() => navigate(`/profile/${p.userId}`)}>
              <div className="flex gap-3 items-center mb-3">
                <div className="avatar" style={{ width: 48, height: 48, fontSize: 18, background: 'var(--accent-dim)' }}>
                  {p.photoUrl ? <img src={p.photoUrl} alt="" /> : getInitials(p.displayName || '?')}
                </div>
                <div>
                  <div className="font-bold">{p.displayName}</div>
                  <span className="badge badge-green" style={{ fontSize: 10 }}>🟢 Looking to play</span>
                </div>
              </div>
              <SkillDisplay level={p.skillLevel || 3} showLabel />
              {p.bio && <p className="text-sm text-muted mt-2 truncate">{p.bio}</p>}
              {p.user?.rating && (
                <div className="text-xs text-muted mt-2" style={{ fontFamily: 'var(--font-mono)' }}>
                  ELO {Math.round(p.user.rating.elo)} · {p.user.rating.wins}W {p.user.rating.losses}L
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
