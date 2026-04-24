import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { getInitials, formatSkill, skillLabel } from '../lib/utils'
import SkillDisplay from '../components/SkillDisplay'
import ChallengeModal from '../components/ChallengeModal'

export default function FindPlayers() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [challengeTarget, setChallengeTarget] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    setLoading(true)
    api.getPlayers({}).then(p => { setPlayers(p); setLoading(false) })
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">FIND PLAYERS</h1>
        <p className="page-subtitle">All registered players</p>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : players.length === 0 ? (
        <div className="empty-state">
          <div className="icon" style={{ fontSize: 48 }}>&#128101;</div>
          <h3>No players found</h3>
          <p>No one has signed up yet!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {players.map(p => (
            <div key={p.userId} className="card">
              <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
                <div className="avatar" style={{
                  width: 56, height: 56, minWidth: 56, fontSize: 18,
                  background: 'var(--accent-dim)', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', border: '2px solid var(--accent)', flexShrink: 0,
                }}>
                  {p.photoUrl ? <img src={p.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(p.displayName || '?')}
                </div>
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div className="flex items-center gap-2 mb-1" style={{ flexWrap: 'wrap' }}>
                    <strong style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${p.userId}`)}>{p.displayName}</strong>
                    {p.lookingToPlay && <span className="badge badge-green" style={{ fontSize: 10 }}>Looking to play</span>}
                  </div>
                  <SkillDisplay level={p.skillLevel || 3} showLabel />
                  <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                    {p.handedness === 'left' ? 'Left' : p.handedness === 'ambidextrous' ? 'Ambi' : 'Right'}-handed
                    {p.yearsPlaying != null && ` · ${p.yearsPlaying}yr${p.yearsPlaying !== 1 ? 's' : ''} playing`}
                    {p.favoritePro && ` · Fav: ${p.favoritePro}`}
                  </div>
                  {(p.preferredFormats || []).length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {(p.preferredFormats || []).map((f: string) => (
                        <span key={f} className="badge badge-blue">{f}</span>
                      ))}
                    </div>
                  )}
                  {p.bio && <p className="text-sm text-muted mt-2" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.bio}</p>}
                  {p.user?.rating && (
                    <div className="text-xs text-muted mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
                      {p.user.rating.wins}W {p.user.rating.losses}L
                      {p.user.rating.elo && ` · ${Math.round(p.user.rating.elo)} ELO`}
                    </div>
                  )}
                  {user && p.userId !== user.id && (
                    <button
                      className="btn btn-primary btn-sm mt-3"
                      onClick={(e) => {
                        e.stopPropagation()
                        setChallengeTarget({ id: p.userId, name: p.displayName })
                      }}
                    >
                      &#9876;&#65039; Challenge
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {challengeTarget && (
        <ChallengeModal
          targetUserId={challengeTarget.id}
          targetName={challengeTarget.name}
          onClose={() => setChallengeTarget(null)}
        />
      )}
    </div>
  )
}
