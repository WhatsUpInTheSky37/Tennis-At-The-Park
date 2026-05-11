import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { getInitials } from '../lib/utils'

type Author = {
  id: string
  isAdmin?: boolean
  profile?: { displayName?: string; photoUrl?: string | null }
}

type Comment = {
  id: string
  articleId: string
  userId: string
  parentId: string | null
  body: string
  hidden: boolean
  editedAt: string | null
  createdAt: string
  author: Author
}

function Avatar({ author, size = 36 }: { author: Author | undefined; size?: number }) {
  return (
    <div style={{
      width: size, height: size, minWidth: size, borderRadius: '50%', overflow: 'hidden',
      background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.38), fontFamily: 'var(--font-display)', color: 'var(--accent)', flexShrink: 0,
    }}>
      {author?.profile?.photoUrl
        ? <img src={author.profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : getInitials(author?.profile?.displayName || '?')
      }
    </div>
  )
}

function ReportDialog({
  onSubmit, onClose,
}: {
  onSubmit: (cat: string, det: string) => Promise<void>
  onClose: () => void
}) {
  const [category, setCategory] = useState('inappropriate')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16,
    }}>
      <div className="card" style={{ maxWidth: 420, width: '100%' }}>
        <h3 style={{ marginBottom: 12 }}>Report this comment</h3>
        <div className="form-group">
          <label className="form-label">Reason</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%' }}>
            <option value="inappropriate">Inappropriate / offensive</option>
            <option value="harassment">Harassment</option>
            <option value="spam">Spam</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Details</label>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="What's wrong with this comment?"
            style={{ width: '100%' }}
          />
        </div>
        {err && <div className="alert alert-danger">{err}</div>}
        <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-danger btn-sm"
            disabled={submitting || !details.trim()}
            onClick={async () => {
              setSubmitting(true); setErr('')
              try { await onSubmit(category, details); onClose() }
              catch (e: any) { setErr(e.message) }
              finally { setSubmitting(false) }
            }}
          >
            {submitting ? 'Reporting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CommentBody({ body }: { body: string }) {
  return <div style={{ fontSize: '0.95rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{body}</div>
}

function CommentForm({
  onSubmit, onCancel, placeholder, autoFocus, initialValue = '', submitLabel = 'Post',
}: {
  onSubmit: (body: string) => Promise<void>
  onCancel?: () => void
  placeholder?: string
  autoFocus?: boolean
  initialValue?: string
  submitLabel?: string
}) {
  const [body, setBody] = useState(initialValue)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!body.trim()) return
        setSubmitting(true); setErr('')
        try {
          await onSubmit(body.trim())
          setBody('')
        } catch (ex: any) {
          setErr(ex.message)
        } finally { setSubmitting(false) }
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}
    >
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder={placeholder || 'Write a comment...'}
        rows={3}
        maxLength={2000}
        autoFocus={autoFocus}
        style={{ width: '100%', resize: 'vertical' }}
      />
      {err && <div className="alert alert-danger" style={{ padding: 6, fontSize: 13 }}>{err}</div>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !body.trim()}>
          {submitting ? 'Posting...' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        )}
      </div>
    </form>
  )
}

function CommentNode({
  c, replies, depth, onReply, onEdit, onDelete, onReport, onToggleHide,
}: {
  c: Comment
  replies: Comment[]
  depth: number
  onReply: (parentId: string, body: string) => Promise<void>
  onEdit: (id: string, body: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReport: (id: string) => void
  onToggleHide: (id: string) => Promise<void>
}) {
  const { user } = useAuth()
  const [showReply, setShowReply] = useState(false)
  const [editing, setEditing] = useState(false)

  const isOwner = !!user && user.id === c.userId
  const canModerate = !!user?.isAdmin
  const hidden = c.hidden

  // When a comment is hidden, non-admins shouldn't see the body. Admins
  // see it dimmed with a "hidden" tag; the API already filters for non-admins,
  // but we double-check here.
  if (hidden && !canModerate) return null

  return (
    <div
      className="card"
      style={{
        padding: 12,
        marginLeft: depth > 0 ? 24 : 0,
        borderLeft: depth > 0 ? '2px solid var(--accent-dim)' : undefined,
        opacity: hidden ? 0.55 : 1,
        background: hidden ? 'var(--gray-50, #f5f5f5)' : undefined,
      }}
    >
      <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
        <Avatar author={c.author} size={depth > 0 ? 30 : 36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="text-xs text-muted mb-1" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link to={`/profile/${c.author?.id}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {c.author?.profile?.displayName || 'Unknown'}
            </Link>
            {c.author?.isAdmin && <span className="badge badge-orange" style={{ fontSize: 9, padding: '0 5px' }}>Admin</span>}
            <span>· {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
            {c.editedAt && <span style={{ fontStyle: 'italic' }}>· edited</span>}
            {hidden && <span className="badge badge-red" style={{ fontSize: 9, padding: '0 5px' }}>Hidden</span>}
          </div>

          {editing ? (
            <CommentForm
              initialValue={c.body}
              submitLabel="Save"
              onCancel={() => setEditing(false)}
              autoFocus
              onSubmit={async (body) => { await onEdit(c.id, body); setEditing(false) }}
            />
          ) : (
            <CommentBody body={c.body} />
          )}

          {!editing && (
            <div className="flex gap-2" style={{ marginTop: 8, flexWrap: 'wrap' }}>
              {user && depth === 0 && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '0 8px', fontSize: 12 }}
                  onClick={() => setShowReply(s => !s)}
                >
                  {showReply ? 'Cancel reply' : 'Reply'}
                </button>
              )}
              {isOwner && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '0 8px', fontSize: 12 }}
                  onClick={() => setEditing(true)}
                >Edit</button>
              )}
              {(isOwner || canModerate) && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '0 8px', fontSize: 12, color: 'var(--red, #c00)' }}
                  onClick={async () => {
                    const msg = depth === 0
                      ? 'Delete this comment and all its replies?'
                      : 'Delete this reply?'
                    if (!confirm(msg)) return
                    await onDelete(c.id)
                  }}
                >Delete</button>
              )}
              {canModerate && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '0 8px', fontSize: 12 }}
                  onClick={() => onToggleHide(c.id)}
                >
                  {hidden ? 'Unhide' : 'Hide'}
                </button>
              )}
              {user && !isOwner && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '0 8px', fontSize: 12 }}
                  onClick={() => onReport(c.id)}
                >Report</button>
              )}
            </div>
          )}

          {showReply && depth === 0 && (
            <CommentForm
              autoFocus
              placeholder={`Reply to ${c.author?.profile?.displayName || 'this comment'}...`}
              submitLabel="Post Reply"
              onCancel={() => setShowReply(false)}
              onSubmit={async (body) => { await onReply(c.id, body); setShowReply(false) }}
            />
          )}
        </div>
      </div>

      {replies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {replies.map(r => (
            <CommentNode
              key={r.id}
              c={r}
              replies={[]}
              depth={depth + 1}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReport={onReport}
              onToggleHide={onToggleHide}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ArticleComments({ articleId }: { articleId: string }) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [reportingId, setReportingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.getArticleComments(articleId)
      setComments(data as Comment[])
    } catch {
      setComments([])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [articleId])

  const visible = user?.isAdmin ? comments : comments.filter(c => !c.hidden)
  const tops = visible.filter(c => !c.parentId)
  const repliesFor = (id: string) => visible.filter(c => c.parentId === id)
  const totalVisible = visible.length

  const postTop = async (body: string) => {
    const c = await api.createArticleComment(articleId, body, null)
    setComments(prev => [...prev, c])
  }

  const postReply = async (parentId: string, body: string) => {
    const c = await api.createArticleComment(articleId, body, parentId)
    setComments(prev => [...prev, c])
  }

  const editComment = async (id: string, body: string) => {
    const updated = await api.editArticleComment(id, body)
    setComments(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c))
  }

  const deleteComment = async (id: string) => {
    await api.deleteArticleComment(id)
    setComments(prev => prev.filter(c => c.id !== id && c.parentId !== id))
  }

  const toggleHide = async (id: string) => {
    const updated = await api.adminToggleHideArticleComment(id)
    setComments(prev => prev.map(c => c.id === id ? { ...c, hidden: updated.hidden } : c))
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2 className="section-title" style={{ fontSize: 18, marginBottom: 12 }}>
        COMMENTS ({totalVisible})
      </h2>

      {user ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
            <Avatar author={user as any} size={36} />
            <div style={{ flex: 1 }}>
              <CommentForm
                onSubmit={postTop}
                placeholder="Share your thoughts on this article..."
                submitLabel="Post Comment"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 16, marginBottom: 16 }}>
          <p className="text-muted" style={{ margin: 0 }}>
            <Link to="/auth" style={{ color: 'var(--accent)' }}>Sign in</Link> to join the discussion.
          </p>
        </div>
      )}

      {loading ? (
        <div className="loading-screen" style={{ padding: 24 }}><div className="spinner" /></div>
      ) : tops.length === 0 ? (
        <div className="text-sm text-muted" style={{ padding: '12px 0' }}>
          No comments yet. {user ? 'Be the first to comment!' : ''}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tops.map(c => (
            <CommentNode
              key={c.id}
              c={c}
              replies={repliesFor(c.id)}
              depth={0}
              onReply={postReply}
              onEdit={editComment}
              onDelete={deleteComment}
              onReport={(id) => setReportingId(id)}
              onToggleHide={toggleHide}
            />
          ))}
        </div>
      )}

      {reportingId && (
        <ReportDialog
          onClose={() => setReportingId(null)}
          onSubmit={async (category, details) => {
            await api.reportArticleComment(reportingId, category, details)
          }}
        />
      )}
    </section>
  )
}
