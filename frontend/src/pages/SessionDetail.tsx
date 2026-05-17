import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { formatDateTime, formatTime, generateICS, copyText, getInitials } from '../lib/utils'
import LocationBadge from '../components/LocationBadge'
import DisclaimerBox from '../components/DisclaimerBox'

function capacityFor(format: string | undefined): number {
  return format && format.includes('doubles') ? 4 : 2
}

function InvitePlayersModal({
  sessionId, excludedIds, onClose, onInvited,
}: {
  sessionId: string
  excludedIds: Set<string>
  onClose: () => void
  onInvited: (invite: any) => void
}) {
  const [query, setQuery] = useState('')
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    const params: Record<string, string> = {}
    if (query.trim()) params.search = query.trim()
    api.getPlayers(params)
      .then(list => { if (!cancelled) setPlayers(list || []) })
      .catch(() => { if (!cancelled) setError('Could not load players') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [query])

  const invite = async (toUser: string) => {
    setSendingId(toUser); setError('')
    try {
      const inv = await api.inviteToSession(sessionId, toUser)
      setSentIds(prev => new Set(prev).add(toUser))
      onInvited(inv)
    } catch (e: any) {
      setError(e.message || 'Could not send invite')
    } finally { setSendingId(null) }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16,
      }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: 480, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 style={{ margin: 0 }}>Invite Players</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <p className="text-xs text-muted" style={{ marginTop: 0, marginBottom: 10 }}>
          Invited players count as "possible" until they accept. Unanswered invites expire when the session starts.
        </p>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search players by name..."
          style={{ width: '100%', marginBottom: 10 }}
        />
        {error && <div className="alert alert-danger" style={{ padding: 6, fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 100 }}>
          {loading ? (
            <div className="loading-screen" style={{ padding: 24 }}><div className="spinner" /></div>
          ) : players.length === 0 ? (
            <div className="text-sm text-muted" style={{ padding: 16, textAlign: 'center' }}>No players found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {players.map(p => {
                const uid = p.user?.id || p.userId
                if (!uid) return null
                const already = excludedIds.has(uid)
                const sent = sentIds.has(uid)
                return (
                  <div key={uid} className="flex items-center gap-2" style={{ padding: 8, borderRadius: 6, background: 'var(--bg2, transparent)' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
                      background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontFamily: 'var(--font-display)', color: 'var(--accent)', flexShrink: 0,
                    }}>
                      {p.photoUrl
                        ? <img src={p.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : getInitials(p.displayName || '?')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{p.displayName}</div>
                      <div className="text-xs text-muted">NTRP {p.skillLevel}</div>
                    </div>
                    {already ? (
                      <span className="text-xs text-muted">In session</span>
                    ) : sent ? (
                      <span className="text-xs" style={{ color: 'var(--accent)' }}>✓ Invited</span>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        disabled={sendingId === uid}
                        onClick={() => invite(uid)}
                      >
                        {sendingId === uid ? 'Sending...' : 'Invite'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportDetails, setReportDetails] = useState('')
  const [reportCategory, setReportCategory] = useState('other')
  const [showInvite, setShowInvite] = useState(false)
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const load = () => {
    if (!id) return
    api.getSession(id).then(s => { setSession(s); setLoading(false) })
  }

  useEffect(() => { load() }, [id])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [session?.messages])

  const isParticipant = session?.participants?.some((p: any) => p.userId === user?.id)
  const isHost = session?.createdBy === user?.id

  // Auto-refresh messages every 30 seconds when participant
  useEffect(() => {
    if (!isParticipant || !id) return
    const interval = setInterval(() => {
      api.getSession(id).then(s => setSession(s)).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [isParticipant, id])

  const join = async () => { await api.joinSession(id!); load() }
  const leave = async () => { await api.leaveSession(id!); load() }

  const sendMsg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!msg.trim()) return
    setSending(true)
    await api.sendMessage(id!, msg.trim())
    setMsg('')
    setSending(false)
    load()
  }

  const copyLink = async () => { await copyText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const downloadICS = () => {
    const content = generateICS(session, session.location)
    const blob = new Blob([content], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'tennis-session.ics'; a.click()
    URL.revokeObjectURL(url)
  }

  const cancelSession = async () => {
    if (!confirm('Cancel this session?')) return
    await api.cancelSession(id!)
    load()
  }

  const submitReport = async () => {
    await api.createReport({ sessionId: id, category: reportCategory, details: reportDetails })
    setShowReport(false)
    alert('Report submitted. Thank you.')
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!session) return <div className="page"><div className="empty-state"><h3>Session not found</h3></div></div>

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate('/activity')}>← Back to Activity</button>

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <span className={`badge ${session.format === 'singles' ? 'badge-blue' : 'badge-orange'}`}>{session.format}</span>
            <span className="badge badge-gray">{session.stakes}</span>
            {session.status === 'cancelled' && <span className="badge badge-red">CANCELLED</span>}
          </div>
          <LocationBadge lighted={session.location?.lighted} />
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: 1, marginBottom: 12 }}>
          📍 {session.location?.name}
        </h1>

        <div className="alert alert-info mb-3" style={{ fontSize: 12 }}>
          🎾 {session.location?.courtCount} courts available · First-come, first-served. Follow posted rotation rules if all courts are occupied.
        </div>

        {(() => {
          const joined = session.participants?.length || 0
          const pendingInvites = (session.invites || []).filter((i: any) => i.status === 'pending')
          const possible = joined + pendingInvites.length
          return (
            <div className="session-meta mb-3">
              <span>🕐 {formatDateTime(session.startTime)} – {formatTime(session.endTime)}</span>
              <span>📊 NTRP {session.levelMin}–{session.levelMax}</span>
              <span>
                👥 {joined} joined
                {pendingInvites.length > 0 && (
                  <> · {possible} possible</>
                )}
              </span>
            </div>
          )
        })()}

        {session.notes && (
          <p className="text-sm" style={{ color: 'var(--text2)', background: 'var(--bg3)', padding: '10px 14px', borderRadius: 8 }}>
            📝 {session.notes}
          </p>
        )}

        <DisclaimerBox showRotation />

        <div className="mt-4">
          <h3 className="text-sm font-bold text-muted uppercase" style={{ letterSpacing: 1, marginBottom: 8 }}>Participants</h3>
          <div className="participant-list">
            {session.participants?.map((p: any) => (
              <span
                key={p.userId}
                className="participant-chip"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/profile/${p.userId}`)}
              >
                <span className="avatar" style={{
                  width: 26, height: 26, fontSize: 10, background: 'var(--accent-dim)',
                  borderRadius: '50%', overflow: 'hidden', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {p.user?.profile?.photoUrl
                    ? <img src={p.user.profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (p.user?.profile?.displayName?.[0] || '?')}
                </span>
                {p.user?.profile?.displayName}
                {p.role === 'host' && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--accent-dim)', color: 'var(--accent)', marginLeft: 4 }}>host</span>}
              </span>
            ))}
          </div>

          {(() => {
            const pendingInvites = (session.invites || []).filter((i: any) => i.status === 'pending')
            if (pendingInvites.length === 0) return null
            return (
              <>
                <h3 className="text-sm font-bold text-muted uppercase" style={{ letterSpacing: 1, marginTop: 12, marginBottom: 8 }}>
                  Invited · {pendingInvites.length} possible
                </h3>
                <div className="participant-list">
                  {pendingInvites.map((inv: any) => {
                    const isMe = inv.toUser === user?.id
                    const name = inv.receiver?.profile?.displayName || 'Player'
                    const photo = inv.receiver?.profile?.photoUrl
                    return (
                      <span
                        key={inv.id}
                        className="participant-chip"
                        style={{
                          opacity: 0.85,
                          border: '1px dashed var(--accent)',
                          background: 'transparent',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        onClick={() => navigate(`/profile/${inv.toUser}`)}
                      >
                        <span className="avatar" style={{
                          width: 26, height: 26, fontSize: 10, background: 'var(--accent-dim)',
                          borderRadius: '50%', overflow: 'hidden', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {photo
                            ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (name[0] || '?')}
                        </span>
                        {name}
                        <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                          {isMe ? 'invited you' : 'pending'}
                        </span>
                        {isMe && (
                          <span
                            style={{ display: 'inline-flex', gap: 4 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ padding: '0 8px', fontSize: 11 }}
                              disabled={respondingInviteId === inv.id}
                              onClick={async () => {
                                setRespondingInviteId(inv.id)
                                try {
                                  await api.respondToInvite(inv.id, 'accepted')
                                  load()
                                } finally { setRespondingInviteId(null) }
                              }}
                            >Accept</button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '0 8px', fontSize: 11 }}
                              disabled={respondingInviteId === inv.id}
                              onClick={async () => {
                                setRespondingInviteId(inv.id)
                                try {
                                  await api.respondToInvite(inv.id, 'declined')
                                  load()
                                } finally { setRespondingInviteId(null) }
                              }}
                            >Decline</button>
                          </span>
                        )}
                        {isHost && (
                          <button
                            type="button"
                            title={`Cancel invite to ${name}`}
                            aria-label={`Cancel invite to ${name}`}
                            disabled={respondingInviteId === inv.id}
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (!confirm(`Cancel the invite to ${name}?`)) return
                              setRespondingInviteId(inv.id)
                              try {
                                await api.cancelInvite(inv.id)
                                load()
                              } finally { setRespondingInviteId(null) }
                            }}
                            style={{
                              marginLeft: 4,
                              width: 22, height: 22,
                              borderRadius: '50%',
                              border: '1px solid var(--red, #c00)',
                              background: 'transparent',
                              color: 'var(--red, #c00)',
                              cursor: 'pointer',
                              fontSize: 12,
                              lineHeight: 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              flexShrink: 0,
                            }}
                          >✕</button>
                        )}
                      </span>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>

        <div className="flex gap-2 flex-wrap mt-4">
          {user && !isParticipant && session.status !== 'cancelled' && (
            <button className="btn btn-primary" onClick={join}>Join Session</button>
          )}
          {user && isParticipant && !isHost && session.status !== 'cancelled' && (
            <button className="btn btn-danger btn-sm" onClick={leave}>Leave Session</button>
          )}
          {isHost && session.status !== 'cancelled' && (() => {
            const tooLate = new Date(session.startTime).getTime() <= Date.now()
            return (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowInvite(true)}
                disabled={tooLate}
                title={tooLate ? 'Too late — the session has already started' : 'Invite players to this session'}
              >
                ➕ Invite Players
              </button>
            )
          })()}
          <button className="btn btn-secondary btn-sm" onClick={copyLink}>{copied ? '✓ Copied!' : '🔗 Copy Link'}</button>
          <button className="btn btn-secondary btn-sm" onClick={downloadICS}>📅 Add to Calendar</button>
          {isHost && session.status !== 'cancelled' && (
            <button className="btn btn-danger btn-sm" onClick={cancelSession}>Cancel Session</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setShowReport(true)}>⚠️ Report</button>
        </div>
      </div>

      {showInvite && (
        <InvitePlayersModal
          sessionId={id!}
          excludedIds={new Set([
            ...((session.participants || []).map((p: any) => p.userId)),
            ...((session.invites || []).filter((i: any) => i.status === 'pending').map((i: any) => i.toUser)),
          ])}
          onClose={() => setShowInvite(false)}
          onInvited={() => load()}
        />
      )}

      {isParticipant && (
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 1, marginBottom: 12 }}>SESSION CHAT</h3>
          <div className="alert alert-info mb-3" style={{ fontSize: 12 }}>
            💬 Be respectful. Follow the <a href="/rules" className="text-accent">Community Rules</a>.
          </div>
          <div className="message-thread">
            {session.messages?.length === 0 && (
              <p className="text-sm text-muted text-center" style={{ padding: '20px 0' }}>No messages yet. Say hi!</p>
            )}
            {session.messages?.map((m: any) => (
              <div key={m.id}>
                <div className="message-meta">{m.user?.profile?.displayName}</div>
                <div className={`message-bubble ${m.fromUser === user?.id ? 'mine' : 'theirs'}`}>{m.body}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMsg} className="flex gap-2 mt-3">
            <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Message…" maxLength={500} style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !msg.trim()}>Send</button>
          </form>
        </div>
      )}

      {showReport && (
        <div className="modal-backdrop" onClick={() => setShowReport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Report Session</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowReport(false)}>✕</button>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={reportCategory} onChange={e => setReportCategory(e.target.value)}>
                <option value="harassment">Harassment / Toxic behavior</option>
                <option value="spam">Spam / Solicitation</option>
                <option value="safety">Safety concern</option>
                <option value="no_show">No-show / repeated cancellations</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Details *</label>
              <textarea value={reportDetails} onChange={e => setReportDetails(e.target.value)} placeholder="Describe the issue clearly and factually…" />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-danger" onClick={submitReport} disabled={reportDetails.length < 10}>Submit Report</button>
              <button className="btn btn-ghost" onClick={() => setShowReport(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
