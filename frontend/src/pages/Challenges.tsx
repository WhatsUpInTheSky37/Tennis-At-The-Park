import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { formatDateTime, formatTime, getInitials } from '../lib/utils'
import SkillDisplay from '../components/SkillDisplay'
import LocationBadge from '../components/LocationBadge'

type Tab = 'received' | 'sent' | 'all'
type StatusFilter = '' | 'pending' | 'accepted' | 'declined'

export default function Challenges() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('received')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [declineId, setDeclineId] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState('')

  const load = () => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (tab === 'received') params.direction = 'received'
    if (tab === 'sent') params.direction = 'sent'
    if (statusFilter) params.status = statusFilter
    api.getChallenges(params).then(c => { setChallenges(c); setLoading(false) })
  }

  useEffect(() => { load() }, [tab, statusFilter])

  const acceptChallenge = async (id: string) => {
    setActionLoading(id)
    try {
      await api.acceptChallenge(id)
      load()
    } finally { setActionLoading(null) }
  }

  const declineChallenge = async (id: string) => {
    setActionLoading(id)
    try {
      await api.declineChallenge(id, declineReason)
      setDeclineId(null)
      setDeclineReason('')
      load()
    } finally { setActionLoading(null) }
  }

  const cancelChallenge = async (id: string) => {
    if (!confirm('Cancel this challenge?')) return
    setActionLoading(id)
    try {
      await api.cancelChallenge(id)
      load()
    } finally { setActionLoading(null) }
  }

  const pendingReceived = challenges.filter(c => c.status === 'pending' && c.challengedId === user?.id)

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'badge-orange',
      accepted: 'badge-green',
      declined: 'badge-red',
      cancelled: 'badge-gray',
      expired: 'badge-gray',
      completed: 'badge-blue'
    }
    return map[status] || 'badge-gray'
  }

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">CHALLENGES</h1>
          <p className="page-subtitle">
            {pendingReceived.length > 0
              ? `${pendingReceived.length} pending challenge${pendingReceived.length > 1 ? 's' : ''} waiting for you`
              : 'Challenge players to matches'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/players')}>Find Players</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {([['received', 'Received'], ['sent', 'Sent'], ['all', 'All']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(key)}
          >
            {label}
            {key === 'received' && pendingReceived.length > 0 && tab !== 'received' && (
              <span style={{
                background: 'var(--red)', color: '#fff', borderRadius: '50%',
                width: 18, height: 18, fontSize: 11, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', marginLeft: 6
              }}>
                {pendingReceived.length}
              </span>
            )}
          </button>
        ))}

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          style={{ marginLeft: 'auto', width: 'auto', fontSize: 13 }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : challenges.length === 0 ? (
        <div className="empty-state">
          <div className="icon" style={{ fontSize: 48 }}>&#9876;</div>
          <h3>{tab === 'received' ? 'No challenges received' : tab === 'sent' ? 'No challenges sent' : 'No challenges yet'}</h3>
          <p>Visit a player's profile to send them a challenge!</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/players')}>Find Players</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {challenges.map(c => {
            const isReceived = c.challengedId === user?.id
            const opponent = isReceived ? c.challenger : c.challenged
            const opponentName = opponent?.profile?.displayName || 'Unknown'
            const isPending = c.status === 'pending'

            return (
              <div key={c.id} className="card" style={{ position: 'relative' }}>
                {/* Status badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-2 items-center">
                    <span className={`badge ${statusBadge(c.status)}`}>{c.status}</span>
                    <span className={`badge ${c.format === 'singles' ? 'badge-blue' : 'badge-orange'}`}>{c.format}</span>
                    <span className="badge badge-gray">{c.stakes}</span>
                  </div>
                  <span className="text-xs text-muted">
                    {isReceived ? 'from' : 'to'} you
                  </span>
                </div>

                {/* Opponent info */}
                <div className="flex gap-3 items-center mb-3">
                  <div className="avatar" style={{ width: 48, height: 48, fontSize: 18, background: 'var(--accent-dim)' }}>
                    {opponent?.profile?.photoUrl
                      ? <img src={opponent.profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : getInitials(opponentName)}
                  </div>
                  <div>
                    <div
                      className="font-bold clickable"
                      onClick={() => navigate(`/profile/${opponent.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      {isReceived ? `${opponentName} challenged you` : `You challenged ${opponentName}`}
                    </div>
                    <div className="flex gap-2 items-center">
                      <SkillDisplay level={opponent?.profile?.skillLevel || 3} />
                      {opponent?.rating && (
                        <span className="text-xs text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                          {opponent.rating.wins}W {opponent.rating.losses}L
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match details */}
                <div className="session-meta mb-2">
                  <span>&#128205; {c.location?.name}</span>
                  <span>&#128336; {formatDateTime(c.proposedTime)} - {formatTime(c.proposedEndTime)}</span>
                </div>

                {c.message && (
                  <p className="text-sm" style={{ color: 'var(--text2)', background: 'var(--bg3)', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
                    "{c.message}"
                  </p>
                )}

                {c.declineReason && c.status === 'declined' && (
                  <p className="text-sm" style={{ color: 'var(--red)', background: 'rgba(255,59,48,0.08)', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
                    Reason: {c.declineReason}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {isPending && isReceived && (
                    <>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => acceptChallenge(c.id)}
                        disabled={actionLoading === c.id}
                      >
                        Accept Challenge
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeclineId(c.id)}
                        disabled={actionLoading === c.id}
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {isPending && !isReceived && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => cancelChallenge(c.id)}
                      disabled={actionLoading === c.id}
                    >
                      Cancel Challenge
                    </button>
                  )}
                  {c.status === 'accepted' && (
                    <>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate('/matches/record')}
                      >
                        Record Match Result
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate('/calendar')}
                      >
                        View on Calendar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Decline Modal */}
      {declineId && (
        <div className="modal-backdrop" onClick={() => { setDeclineId(null); setDeclineReason('') }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Decline Challenge</div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setDeclineId(null); setDeclineReason('') }}>&#10005;</button>
            </div>
            <div className="form-group">
              <label>Reason (optional)</label>
              <textarea
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                placeholder="e.g. Can't make that time, busy that day..."
                maxLength={200}
              />
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-danger"
                onClick={() => declineChallenge(declineId)}
                disabled={actionLoading === declineId}
              >
                Decline Challenge
              </button>
              <button className="btn btn-ghost" onClick={() => { setDeclineId(null); setDeclineReason('') }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
