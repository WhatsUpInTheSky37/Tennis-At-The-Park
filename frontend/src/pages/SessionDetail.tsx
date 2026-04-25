import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { formatDateTime, formatTime, generateICS, copyText } from '../lib/utils'
import LocationBadge from '../components/LocationBadge'
import DisclaimerBox from '../components/DisclaimerBox'

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

        <div className="session-meta mb-3">
          <span>🕐 {formatDateTime(session.startTime)} – {formatTime(session.endTime)}</span>
          <span>📊 NTRP {session.levelMin}–{session.levelMax}</span>
          <span>👥 {session.participants?.length || 0} joined</span>
        </div>

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
        </div>

        <div className="flex gap-2 flex-wrap mt-4">
          {user && !isParticipant && session.status !== 'cancelled' && (
            <button className="btn btn-primary" onClick={join}>Join Session</button>
          )}
          {user && isParticipant && !isHost && session.status !== 'cancelled' && (
            <button className="btn btn-danger btn-sm" onClick={leave}>Leave Session</button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={copyLink}>{copied ? '✓ Copied!' : '🔗 Copy Link'}</button>
          <button className="btn btn-secondary btn-sm" onClick={downloadICS}>📅 Add to Calendar</button>
          {isHost && session.status !== 'cancelled' && (
            <button className="btn btn-danger btn-sm" onClick={cancelSession}>Cancel Session</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setShowReport(true)}>⚠️ Report</button>
        </div>
      </div>

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
