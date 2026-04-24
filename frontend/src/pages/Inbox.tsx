import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { getInitials } from '../lib/utils'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function Inbox() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox')
  const [inbox, setInbox] = useState<any[]>([])
  const [sent, setSent] = useState<any[]>([])
  const [inboxTotal, setInboxTotal] = useState(0)
  const [sentTotal, setSentTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)
  const [players, setPlayers] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    loadMessages()
  }, [tab, page])

  useEffect(() => {
    api.getPlayers({}).then(setPlayers).catch(() => {})
  }, [])

  const loadMessages = async () => {
    setLoading(true)
    try {
      if (tab === 'inbox') {
        const data = await api.getInbox(page)
        setInbox(data.messages)
        setInboxTotal(data.total)
        setUnreadCount(data.unreadCount)
      } else {
        const data = await api.getSentMessages(page)
        setSent(data.messages)
        setSentTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!composeTo || !composeBody.trim()) return
    setSending(true)
    setError('')
    try {
      await api.sendDm(composeTo, composeSubject, composeBody)
      setShowCompose(false)
      setComposeTo('')
      setComposeSubject('')
      setComposeBody('')
      if (tab === 'sent') loadMessages()
    } catch (e: any) {
      setError(e.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this message?')) return
    await api.deleteDm(id)
    loadMessages()
  }

  const totalPages = Math.ceil((tab === 'inbox' ? inboxTotal : sentTotal) / 20)
  const messages = tab === 'inbox' ? inbox : sent

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="page-title">MESSAGES</h1>
          {unreadCount > 0 && <span className="text-sm" style={{ color: 'var(--green-500)' }}>{unreadCount} unread</span>}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCompose(!showCompose)}>
          + New Message
        </button>
      </div>

      {showCompose && (
        <div className="card mb-4">
          <h3 style={{ marginBottom: 12 }}>New Message</h3>
          <div className="form-group">
            <label className="form-label">To</label>
            <select value={composeTo} onChange={e => setComposeTo(e.target.value)} style={{ width: '100%' }}>
              <option value="">Select a player...</option>
              {players.map(p => (
                <option key={p.userId} value={p.userId}>{p.displayName}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Subject (optional)</label>
            <input
              type="text"
              value={composeSubject}
              onChange={e => setComposeSubject(e.target.value)}
              placeholder="Subject"
              maxLength={200}
              style={{ width: '100%' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea
              value={composeBody}
              onChange={e => setComposeBody(e.target.value)}
              placeholder="Write your message..."
              rows={4}
              style={{ width: '100%' }}
            />
          </div>
          {error && <p className="text-sm" style={{ color: '#ff4444', marginBottom: 8 }}>{error}</p>}
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={handleSend} disabled={sending || !composeTo || !composeBody.trim()}>
              {sending ? 'Sending...' : 'Send'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCompose(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="tabs mb-4">
        <button className={`tab-btn ${tab === 'inbox' ? 'active' : ''}`} onClick={() => { setTab('inbox'); setPage(1) }}>
          Inbox {unreadCount > 0 && `(${unreadCount})`}
        </button>
        <button className={`tab-btn ${tab === 'sent' ? 'active' : ''}`} onClick={() => { setTab('sent'); setPage(1) }}>
          Sent
        </button>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : messages.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48 }}>&#9993;</div>
          <h3>{tab === 'inbox' ? 'No messages yet' : 'No sent messages'}</h3>
          <p>{tab === 'inbox' ? 'When someone messages you, it will show up here.' : 'Messages you send will appear here.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {messages.map(msg => {
            const other = tab === 'inbox' ? msg.sender : msg.receiver
            const otherName = other?.profile?.displayName || 'Unknown'
            const otherPhoto = other?.profile?.photoUrl
            const isUnread = tab === 'inbox' && !msg.read

            return (
              <div
                key={msg.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  borderLeft: isUnread ? '3px solid var(--green-500)' : '3px solid transparent',
                  background: isUnread ? 'var(--accent-dim)' : undefined,
                }}
                onClick={() => navigate(`/messages/${other?.id}`)}
              >
                <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                    border: '2px solid var(--accent)', background: 'var(--accent-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  }}>
                    {otherPhoto
                      ? <img src={otherPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getInitials(otherName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                      <strong style={{ fontWeight: isUnread ? 800 : 600 }}>{otherName}</strong>
                      <span className="text-xs text-muted">{timeAgo(msg.createdAt)}</span>
                      {isUnread && <span className="badge badge-green" style={{ fontSize: 9, padding: '1px 6px' }}>NEW</span>}
                    </div>
                    {msg.subject && <div className="text-sm" style={{ fontWeight: isUnread ? 700 : 400, marginTop: 2 }}>{msg.subject}</div>}
                    <p className="text-sm text-muted" style={{ marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {msg.body}
                    </p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flexShrink: 0, fontSize: 12, padding: '4px 8px' }}
                    onClick={(e) => { e.stopPropagation(); handleDelete(msg.id) }}
                  >
                    &#10005;
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex gap-2 mt-4" style={{ justifyContent: 'center' }}>
          {page > 1 && <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p - 1)}>Previous</button>}
          <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>Page {page} of {totalPages}</span>
          {page < totalPages && <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p + 1)}>Next</button>}
        </div>
      )}
    </div>
  )
}
