import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { getInitials } from '../lib/utils'
import { formatDistanceToNow } from 'date-fns'

const PAGE_SIZE = 10

export default function Forum() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadPosts = async (offset = 0) => {
    setLoading(true)
    try {
      const data = await api.getForumPosts({ limit: String(PAGE_SIZE), offset: String(offset) })
      setPosts(data.posts)
      setTotal(data.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadPosts(page * PAGE_SIZE) }, [page])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const post = await api.createForumPost({ subject, body })
      setSubject('')
      setBody('')
      setShowForm(false)
      navigate(`/forum/${post.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally { setSubmitting(false) }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">FORUM</h1>
          <p className="page-subtitle">Community discussion board</p>
        </div>
        {user && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Post'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-4">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="What's on your mind?"
                required
                maxLength={200}
                style={{ width: '100%' }}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Message</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Share details, ask a question, report something..."
                required
                maxLength={5000}
                rows={4}
                style={{ width: '100%' }}
              />
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Posting...' : 'Post to Forum'}
            </button>
          </form>
        </div>
      )}

      {!user && (
        <div className="card mb-4" style={{ textAlign: 'center', padding: '16px' }}>
          <p className="text-muted">
            <Link to="/auth" style={{ color: 'var(--accent)' }}>Sign in</Link> to create posts and reply.
          </p>
        </div>
      )}

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="icon" style={{ fontSize: 48 }}>💬</div>
          <h3>No posts yet</h3>
          <p>Be the first to start a discussion!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {posts.map(p => (
            <Link key={p.id} to={`/forum/${p.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer' }}>
                <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
                  <div style={{
                    width: 40, height: 40, minWidth: 40, borderRadius: '50%', overflow: 'hidden',
                    background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontFamily: 'var(--font-display)', color: 'var(--accent)', flexShrink: 0,
                  }}>
                    {p.author?.profile?.photoUrl
                      ? <img src={p.author.profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getInitials(p.author?.profile?.displayName || '?')
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 2 }}>{p.subject}</div>
                    <div className="text-sm text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.body}
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>{p.author?.profile?.displayName}</span>
                      <span>{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}</span>
                      <span>{p._count?.replies || 0} {p._count?.replies === 1 ? 'reply' : 'replies'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-3">
              {page > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p - 1)}>← Previous</button>
              )}
              <span className="text-sm text-muted">{page + 1} of {totalPages}</span>
              {page < totalPages - 1 && (
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p + 1)}>Next →</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
