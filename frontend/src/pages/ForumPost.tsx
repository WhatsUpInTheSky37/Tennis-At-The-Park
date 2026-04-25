import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { getInitials } from '../lib/utils'
import { formatDistanceToNow, format } from 'date-fns'

export default function ForumPost() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [replyBody, setReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    if (id) {
      setLoading(true)
      api.getForumPost(id).then(setPost).finally(() => setLoading(false))
    }
  }, [id])

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSubmitting(true)
    setError('')
    try {
      const reply = await api.createForumReply(id, replyBody)
      setPost((prev: any) => ({ ...prev, replies: [...prev.replies, reply] }))
      setReplyBody('')
    } catch (err: any) {
      setError(err.message)
    } finally { setSubmitting(false) }
  }

  if (loading) return <div className="page"><div className="loading-screen"><div className="spinner" /></div></div>
  if (!post) return <div className="page"><div className="empty-state"><h3>Post not found</h3></div></div>

  return (
    <div className="page">
      <Link to="/forum" className="btn btn-ghost btn-sm mb-4">← Back to Forum</Link>

      <div className="card mb-4">
        <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
          <div style={{
            width: 48, height: 48, minWidth: 48, borderRadius: '50%', overflow: 'hidden',
            background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontFamily: 'var(--font-display)', color: 'var(--accent)', flexShrink: 0,
          }}>
            {post.author?.profile?.photoUrl
              ? <img src={post.author.profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : getInitials(post.author?.profile?.displayName || '?')
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 4 }}>
              {post.subject}
            </h1>
            <div className="text-xs text-muted mb-3" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>
                <Link to={`/profile/${post.author?.id}`} style={{ color: 'var(--accent)' }}>
                  {post.author?.profile?.displayName}
                </Link>
                {' · '}{format(new Date(post.createdAt), 'MMM d, yyyy h:mm a')}
              </span>
              {user && user.id === post.author?.id && (
                <>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={() => {
                      setEditing(!editing)
                      setEditSubject(post.subject)
                      setEditBody(post.body)
                    }}
                  >
                    {editing ? 'Cancel Edit' : 'Edit'}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={async () => {
                      if (!confirm('Delete this post and all its replies?')) return
                      await api.deleteForumPost(post.id)
                      navigate('/forum')
                    }}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
            {editing ? (
              <form onSubmit={async (e) => {
                e.preventDefault()
                setEditSaving(true)
                try {
                  const updated = await api.editForumPost(post.id, { subject: editSubject, body: editBody })
                  setPost(updated)
                  setEditing(false)
                } catch (err: any) {
                  setError(err.message)
                } finally { setEditSaving(false) }
              }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Subject</label>
                  <input value={editSubject} onChange={e => setEditSubject(e.target.value)} required maxLength={200} style={{ width: '100%' }} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Message</label>
                  <textarea value={editBody} onChange={e => setEditBody(e.target.value)} required maxLength={5000} rows={4} style={{ width: '100%' }} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={editSaving}>
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{post.body}</div>
            )}
          </div>
        </div>
      </div>

      <h2 className="section-title" style={{ fontSize: 18 }}>
        REPLIES ({post.replies?.length || 0})
      </h2>

      {post.replies?.length === 0 && (
        <div className="text-sm text-muted mb-4" style={{ padding: '12px 0' }}>No replies yet. Be the first to respond!</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {post.replies?.map((r: any) => (
          <div key={r.id} className="card" style={{ padding: 14 }}>
            <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
              <div style={{
                width: 36, height: 36, minWidth: 36, borderRadius: '50%', overflow: 'hidden',
                background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontFamily: 'var(--font-display)', color: 'var(--accent)', flexShrink: 0,
              }}>
                {r.author?.profile?.photoUrl
                  ? <img src={r.author.profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : getInitials(r.author?.profile?.displayName || '?')
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-xs text-muted mb-1">
                  <Link to={`/profile/${r.author?.id}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    {r.author?.profile?.displayName}
                  </Link>
                  {' · '}{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                </div>
                <div className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{r.body}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {user ? (
        <div className="card">
          <form onSubmit={handleReply} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label className="form-label">Reply</label>
            <textarea
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              placeholder="Write a reply..."
              required
              maxLength={2000}
              rows={3}
              style={{ width: '100%' }}
            />
            {error && <div className="alert alert-danger">{error}</div>}
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !replyBody.trim()}>
              {submitting ? 'Posting...' : 'Post Reply'}
            </button>
          </form>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <p className="text-muted">
            <Link to="/auth" style={{ color: 'var(--accent)' }}>Sign in</Link> to reply.
          </p>
        </div>
      )}
    </div>
  )
}
