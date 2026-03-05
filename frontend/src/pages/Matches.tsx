import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { formatDateTime } from '../lib/utils'

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

  const getPlayerName = (match: any, playerId: string) => {
    return match.playerNames?.[playerId] || 'Unknown'
  }

  const formatTeam = (match: any, playerIds: string[]) => {
    return playerIds.map(id => getPlayerName(match, id)).join(' / ')
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {matches.map(m => {
            const teams = m.teamsJson as { team1: string[], team2: string[] }
            const winners = m.winnerUserIdsJson as string[]
            const iAmInvolved = user && [...teams.team1, ...teams.team2].includes(user.id)
            const iWon = user && winners.includes(user.id)
            const score = (m.scoreJson as number[][])?.map(s => s.join('-')).join(', ')

            return (
              <div key={m.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-2">
                    <span className={`badge ${m.format === 'singles' ? 'badge-blue' : 'badge-orange'}`}>{m.format}</span>
                    {statusBadge(m.status)}
                    {m.retiredFlag && <span className="badge badge-gray">Retirement</span>}
                    {m.timeRanOutFlag && <span className="badge badge-gray">Time limit</span>}
                  </div>
                  {iAmInvolved && <span style={{ fontFamily: 'var(--font-display)', fontSize: 20 }} className={iWon ? 'text-accent' : 'text-red'}>
                    {iWon ? 'WIN' : 'LOSS'}
                  </span>}
                </div>

                <div className="text-sm text-muted mb-2">{formatDateTime(m.playedAt)} · {m.location?.name}</div>

                {/* Player Names */}
                <div style={{ marginBottom: 8, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 'var(--radius-sm)', fontSize: 14 }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{formatTeam(m, teams.team1)}</span>
                    {winners.some(w => teams.team1.includes(w)) && (
                      <span className="badge badge-green" style={{ fontSize: 10, padding: '1px 6px' }}>W</span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 12, margin: '2px 0' }}>vs</div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontWeight: 600 }}>{formatTeam(m, teams.team2)}</span>
                    {winners.some(w => teams.team2.includes(w)) && (
                      <span className="badge badge-green" style={{ fontSize: 10, padding: '1px 6px' }}>W</span>
                    )}
                  </div>
                </div>

                {score && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>
                    {score}
                  </div>
                )}

                {m.notes && <p className="text-sm text-muted">{m.notes}</p>}

                {/* Actions for pending confirmation */}
                {user && m.status === 'pending_confirmation' && [...teams.team1, ...teams.team2].includes(user.id) && !teams.team1.includes(user.id) && (
                  <div className="flex gap-2 mt-3">
                    <button className="btn btn-primary btn-sm" onClick={() => confirm(m.id)}>Confirm Result</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setShowDispute(m.id)}>Dispute</button>
                  </div>
                )}
                {user && m.status === 'normal' && [...teams.team1, ...teams.team2].includes(user.id) && (
                  <button className="btn btn-ghost btn-sm mt-2" onClick={() => setShowDispute(m.id)}>Dispute this match</button>
                )}

                {/* Delete/Cancel button for pending matches the user is in */}
                {user && m.status === 'pending_confirmation' && [...teams.team1, ...teams.team2].includes(user.id) && (
                  <div style={{ marginTop: 8 }}>
                    {deleting === m.id ? (
                      <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <p className="text-sm" style={{ marginBottom: 8 }}>Are you sure you want to delete this match?</p>
                        <div className="flex gap-2">
                          <button className="btn btn-danger btn-sm" onClick={() => deleteMatch(m.id)}>Yes, Delete</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setDeleting(null)}>Cancel</button>
                        </div>
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
