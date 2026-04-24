import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { getInitials } from '../lib/utils'

function formatTime(date: string) {
  const d = new Date(date)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function Conversation() {
  const { userId: otherUserId } = useParams<{ userId: string }>()
  const { user } = useAuth()
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [otherName, setOtherName] = useState('')
  const [otherPhoto, setOtherPhoto] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!otherUserId) return
    loadConversation()
    api.getProfile(otherUserId).then(p => {
      setOtherName(p.displayName || 'Unknown')
      setOtherPhoto(p.photoUrl || '')
    }).catch(() => {})
  }, [otherUserId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversation = async () => {
    if (!otherUserId) return
    setLoading(true)
    try {
      const data = await api.getConversation(otherUserId)
      setMessages(data)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!body.trim() || !otherUserId) return
    setSending(true)
    try {
      await api.sendDm(otherUserId, '', body)
      setBody('')
      loadConversation()
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link to="/messages" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>&#8592;</Link>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          border: '2px solid var(--accent)', background: 'var(--accent-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>
          {otherPhoto
            ? <img src={otherPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : getInitials(otherName || '?')}
        </div>
        <div>
          <strong>{otherName || 'Loading...'}</strong>
          <div className="text-xs text-muted">
            <Link to={`/profile/${otherUserId}`} style={{ color: 'inherit' }}>View profile</Link>
          </div>
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8,
        padding: '8px 0', minHeight: 0,
      }}>
        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : messages.length === 0 ? (
          <div className="empty-state" style={{ flex: 1 }}>
            <p className="text-muted">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.fromId === user?.id
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: isMe ? 'var(--green-600)' : 'var(--surface)',
                  color: isMe ? '#fff' : 'inherit',
                  border: isMe ? 'none' : '1px solid var(--border)',
                }}>
                  {msg.subject && <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 4 }}>{msg.subject}</div>}
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.92rem' }}>{msg.body}</div>
                  <div style={{
                    fontSize: '0.7rem', marginTop: 4,
                    opacity: 0.7, textAlign: isMe ? 'right' : 'left',
                  }}>
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      <div style={{
        display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)',
        marginTop: 'auto',
      }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={2}
          style={{ flex: 1, resize: 'none' }}
        />
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={sending || !body.trim()}
          style={{ alignSelf: 'flex-end' }}
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
