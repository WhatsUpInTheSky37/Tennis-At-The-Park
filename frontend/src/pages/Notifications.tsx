import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { getInitials } from '../lib/utils'
import { formatDistanceToNow } from 'date-fns'

function describe(n: any): string {
  switch (n.type) {
    case 'forum_reply':   return 'replied to your post'
    case 'forum_mention': return 'mentioned you in the forum'
    case 'forum_reaction': return 'reacted to your post'
    default: return 'sent you a notification'
  }
}

function targetLink(n: any): string {
  if (n.post?.id) return `/forum/${n.post.id}`
  if (n.reply?.postId) return `/forum/${n.reply.postId}`
  return '/forum'
}

export default function Notifications() {
  const navigate = useNavigate()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.getNotifications().then(setItems).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleClick = async (n: any) => {
    if (!n.read) {
      await api.markNotificationRead(n.id).catch(() => {})
    }
    navigate(targetLink(n))
  }

  const markAllRead = async () => {
    await api.markAllNotificationsRead()
    load()
  }

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">NOTIFICATIONS</h1>
          <p className="page-subtitle">Replies, mentions, and reactions on your posts</p>
        </div>
        {items.some(i => !i.read) && (
          <button className="btn btn-secondary btn-sm" onClick={markAllRead}>Mark all read</button>
        )}
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon" style={{ fontSize: 48 }}>🔔</div>
          <h3>No notifications yet</h3>
          <p>You'll see replies and mentions here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(n => (
            <div
              key={n.id}
              className="card"
              style={{
                cursor: 'pointer',
                background: n.read ? undefined : 'var(--accent-dim)',
                padding: 14,
              }}
              onClick={() => handleClick(n)}
            >
              <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, minWidth: 36, borderRadius: '50%', overflow: 'hidden',
                  background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontFamily: 'var(--font-display)', color: 'var(--accent)', flexShrink: 0,
                }}>
                  {n.fromUser?.profile?.photoUrl
                    ? <img src={n.fromUser.profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : getInitials(n.fromUser?.profile?.displayName || '?')
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: 2 }}>
                    <span style={{ fontWeight: 700 }}>{n.fromUser?.profile?.displayName || 'Someone'}</span>
                    {' '}
                    <span className="text-sm">{describe(n)}</span>
                    {n.post?.subject && (
                      <span className="text-sm text-muted"> · "{n.post.subject}"</span>
                    )}
                  </div>
                  {n.reply?.body && (
                    <div className="text-sm text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.reply.body}
                    </div>
                  )}
                  <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </div>
                </div>
                {!n.read && (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 6,
                  }} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link to="/forum" className="btn btn-ghost btn-sm">Back to Forum</Link>
      </div>
    </div>
  )
}
