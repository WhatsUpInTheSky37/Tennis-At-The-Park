import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { formatDateTime, getInitials } from '../lib/utils'

function PlayerAvatar({ name, photo, size = 44 }: { name: string; photo?: string | null; size?: number }) {
  return (
    <div className="match-avatar" style={{ width: size, height: size, fontSize: size * 0.3 }}>
      {photo
        ? <img src={photo} alt="" />
        : getInitials(name)
      }
    </div>
  )
}

function TeamDisplay({ match, playerIds, isWinner }: { match: any; playerIds: string[]; isWinner: boolean }) {
  return (
    <div className={`match-team ${isWinner ? 'match-team-winner' : ''}`}>
      <div className="match-team-avatars">
        {playerIds.map(id => (
          <PlayerAvatar
            key={id}
            name={match.playerNames?.[id] || 'Unknown'}
            photo={match.playerPhotos?.[id]}
          />
        ))}
      </div>
      <div className="match-team-names">
        {playerIds.map((id, i) => (
          <span key={id} className="match-player-name">
            {i > 0 && <span className="match-team-separator">&</span>}
            {match.playerNames?.[id] || 'Unknown'}
          </span>
        ))}
      </div>
      {isWinner && <span className="match-winner-tag">W</span>}
    </div>
  )
}

export default function Matches() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDispute, setShowDispute] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeDetails, setDisputeDetails] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    api.getMatches().then(m => { setMatches(m); setLoading(false) })
  }, [])

  const confirm = async (id: string) => {
    await api.confirmMatch(id)
    api.getMatches().then(setMatches)
  }

  const dispute = async () => {
    if (!showDispute) return
    await api.disputeMatch(showDispute, disputeReason, disputeDetails)
    setShowDispute(null)
    api.getMatches().then(setMatches)
  }

  const deleteMatch = async (id: string) => {
    try {
      await api.deleteMatch(id)
      setMatches(ms => ms.filter(m => m.id !== id))
      setDeleting(null)
    } catch (err: any) {
      alert(err.message || 'Failed to delete match')
      setDeleting(null)
    }
  }

  const statusBadge = (s: string) => {
    if (s === 'normal') return <span className="badge badge-green">Confirmed</span>
    if (s === 'pending_confirmation') return <span className="badge badge-orange">Pending</span>
    if (s === 'disputed') return <span className="badge badge-red">Disputed</span>
    return null
  }

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">MATCHES</h1>
          <p className="page-subtitle">Previous match results</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/matches/record')}>+ Record Match</button>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : matches.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🏆</div>
          <h3>No matches recorded yet</h3>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/matches/record')}>Record a Match</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {matches.map(m => {
            const teams = m.teamsJson as { team1: string[], team2: string[] }
            const winners = m.winnerUserIdsJson as string[]
            const iAmInvolved = user && [...teams.team1, ...teams.team2].includes(user.id)
            const iWon = user && winners.includes(user.id)
            const scores = m.scoreJson as number[][]
            const team1Won = winners.some(w => teams.team1.includes(w))

            return (
              <div key={m.id} className="match-card">
                {/* Top bar: meta info */}
                <div className="match-card-header">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${m.format === 'singles' ? 'badge-blue' : 'badge-orange'}`}>{m.format}</span>
                    {statusBadge(m.status)}
                    {m.retiredFlag && <span className="badge badge-gray">Retirement</span>}
                    {m.timeRanOutFlag && <span className="badge badge-gray">Time limit</span>}
                  </div>
                  {iAmInvolved && (
                    <div className={`match-result-tag ${iWon ? 'match-result-win' : 'match-result-loss'}`}>
                      {iWon ? 'WIN' : 'LOSS'}
                    </div>
                  )}
                </div>

                {/* Matchup: Team1 vs Team2 */}
                <div className="match-matchup">
                  <TeamDisplay match={m} playerIds={teams.team1} isWinner={team1Won} />

                  <div className="match-vs-section">
                    <div className="match-vs">VS</div>
                    {scores && (
                      <div className="match-score-sets">
                        {scores.map((set, i) => (
                          <div key={i} className="match-set">
                            <span className={team1Won ? 'match-set-winner' : 'match-set-loser'}>{set[0]}</span>
                            <span className="match-set-dash">–</span>
                            <span className={!team1Won ? 'match-set-winner' : 'match-set-loser'}>{set[1]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <TeamDisplay match={m} playerIds={teams.team2} isWinner={!team1Won} />
                </div>

                {/* Footer: date, location, notes */}
                <div className="match-card-footer">
                  <span className="text-xs text-muted">{formatDateTime(m.playedAt)}</span>
                  {m.location?.name && <span className="text-xs text-muted">· {m.location.name}</span>}
                </div>

                {m.notes && <p className="text-xs text-muted" style={{ padding: '0 16px 12px', marginTop: -4 }}>{m.notes}</p>}

                {/* Actions */}
                {user && m.status === 'pending_confirmation' && [...teams.team1, ...teams.team2].includes(user.id) && !teams.team1.includes(user.id) && (
                  <div className="match-card-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => confirm(m.id)}>Confirm Result</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setShowDispute(m.id)}>Dispute</button>
                  </div>
                )}
                {user && m.status === 'normal' && [...teams.team1, ...teams.team2].includes(user.id) && (
                  <div className="match-card-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowDispute(m.id)}>Dispute this match</button>
                  </div>
                )}

                {user && m.status === 'pending_confirmation' && [...teams.team1, ...teams.team2].includes(user.id) && (
                  <div className="match-card-actions">
                    {deleting === m.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="text-xs text-muted">Delete this match?</span>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteMatch(m.id)}>Yes, Delete</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDeleting(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDeleting(m.id)}>
                        Delete Match
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showDispute && (
        <div className="modal-backdrop" onClick={() => setShowDispute(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Dispute Match Result</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDispute(null)}>✕</button>
            </div>
            <div className="alert alert-warning mb-4">
              Disputes should be civil and factual. Elo updates will be paused until resolved.
            </div>
            <div className="form-group">
              <label>Reason *</label>
              <select value={disputeReason} onChange={e => setDisputeReason(e.target.value)}>
                <option value="">Select reason...</option>
                <option value="wrong_score">Wrong score reported</option>
                <option value="wrong_winner">Wrong winner</option>
                <option value="not_played">Match was not played</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Details *</label>
              <textarea value={disputeDetails} onChange={e => setDisputeDetails(e.target.value)} placeholder="Describe the issue clearly and factually..." />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-danger" onClick={dispute} disabled={!disputeReason || disputeDetails.length < 10}>Submit Dispute</button>
              <button className="btn btn-ghost" onClick={() => setShowDispute(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
