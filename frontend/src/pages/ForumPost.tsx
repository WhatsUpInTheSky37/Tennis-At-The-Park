import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { getInitials } from '../lib/utils'
import { REACTION_EMOJIS, summarizeReactions, renderRichText, RichTextarea } from '../lib/forumUtils'
import { formatDistanceToNow, format } from 'date-fns'

function ReactionBar({
  rows, currentUserId, onReact,
}: { rows: any[]; currentUserId?: string; onReact: (emoji: string) => void }) {
  const summary = summarizeReactions(rows, currentUserId)
  const [showPicker, setShowPicker] = useState(false)
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
      {summary.map(r => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onReact(r.emoji)}
          style={{
            border: r.mine ? '1.5px solid var(--accent)' : '1px solid var(--gray-200, #e5e5e5)',
            background: r.mine ? 'var(--accent-dim)' : 'transparent',
            borderRadius: 14,
            padding: '2px 10px',
            fontSize: 13,
            cursor: 'pointer',
            display: 'inline-flex',
            gap: 4,
            alignItems: 'center',
          }}
        >
          <span>{r.emoji}</span>
          <span style={{ fontWeight: 600 }}>{r.count}</span>
        </button>
      ))}
      {currentUserId && (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            style={{
              border: '1px dashed var(--gray-300, #ccc)',
              background: 'transparent',
              borderRadius: 14,
              padding: '2px 10px',
              fontSize: 13,
              cursor: 'pointer',
              color: 'var(--text3, #888)',
            }}
          >
            + React
          </button>
          {showPicker && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 5,
              background: 'var(--surface, #fff)', border: '1px solid var(--gray-200, #e5e5e5)',
              borderRadius: 8, padding: 6, display: 'flex', gap: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}>
              {REACTION_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { onReact(e); setShowPicker(false) }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, padding: '4px 6px' }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ReportDialog({ onSubmit, onClose }: { onSubmit: (cat: string, det: string) => Promise<void>; onClose: () => void }) {
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
        <h3 style={{ marginBottom: 12 }}>Report this content</h3>
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
            placeholder="What's wrong with this post?"
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
  const [editCategoryId, setEditCategoryId] = useState<string>('')
  const [editSaving, setEditSaving] = useState(false)
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [editReplyBody, setEditReplyBody] = useState('')
  const [reporting, setReporting] = useState<{ kind: 'post' | 'reply'; id: string } | null>(null)
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    if (id) {
      setLoading(true)
      api.getForumPost(id).then(setPost).finally(() => setLoading(false))
    }
  }, [id])

  useEffect(() => { api.getForumCategories().then(setCategories).catch(() => {}) }, [])

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

  const reactToPost = async (emoji: string) => {
    if (!post || !user) return
    await api.reactToForumPost(post.id, emoji)
    const fresh = await api.getForumPost(post.id)
    setPost(fresh)
  }

  const reactToReply = async (replyId: string, emoji: string) => {
    if (!post || !user) return
    await api.reactToForumReply(replyId, emoji)
    const fresh = await api.getForumPost(post.id)
    setPost(fresh)
  }

  const togglePin = async () => {
    if (!post) return
    const updated = await api.pinForumPost(post.id)
    setPost((prev: any) => ({ ...prev, pinned: updated.pinned, category: updated.category }))
  }

  if (loading) return <div className="page"><div className="loading-screen"><div className="spinner" /></div></div>
  if (!post) return <div className="page"><div className="empty-state"><h3>Post not found</h3></div></div>

  const isOwner = user && user.id === post.author?.id
  const canModerate = user?.isAdmin

  return (
    <div className="page">
      <Link to="/forum" className="btn btn-ghost btn-sm mb-4">← Back to Forum</Link>

      <div className="card mb-4" style={{ borderLeft: post.pinned ? '3px solid var(--accent)' : undefined }}>
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
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              {post.pinned && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>📌 PINNED</span>}
              {post.category && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 600 }}>
                  {post.category.emoji} {post.category.name}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 4 }}>
              {post.subject}
            </h1>
            <div className="text-xs text-muted mb-3" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>
                <Link to={`/profile/${post.author?.id}`} style={{ color: 'var(--accent)' }}>
                  {post.author?.profile?.displayName}
                </Link>
                {' · '}{format(new Date(post.createdAt), 'MMM d, yyyy h:mm a')}
                {post.editedAt && <span style={{ fontStyle: 'italic' }}> · edited {formatDistanceToNow(new Date(post.editedAt), { addSuffix: true })}</span>}
              </span>
              {isOwner && (
                <>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={() => {
                      setEditing(!editing)
                      setEditSubject(post.subject)
                      setEditBody(post.body)
                      setEditCategoryId(post.categoryId || '')
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
              {canModerate && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '2px 8px', fontSize: 11 }}
                  onClick={togglePin}
                >
                  {post.pinned ? 'Unpin' : 'Pin'}
                </button>
              )}
              {user && !isOwner && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '2px 8px', fontSize: 11 }}
                  onClick={() => setReporting({ kind: 'post', id: post.id })}
                >
                  Report
                </button>
              )}
            </div>
            {editing ? (
              <form onSubmit={async (e) => {
                e.preventDefault()
                setEditSaving(true)
                try {
                  const updated = await api.editForumPost(post.id, {
                    subject: editSubject,
                    body: editBody,
                    categoryId: editCategoryId || null,
                  })
                  setPost(updated)
                  setEditing(false)
                } catch (err: any) {
                  setError(err.message)
                } finally { setEditSaving(false) }
              }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Category</label>
                  <select value={editCategoryId} onChange={e => setEditCategoryId(e.target.value)} style={{ width: '100%' }}>
                    <option value="">— None —</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Subject</label>
                  <input value={editSubject} onChange={e => setEditSubject(e.target.value)} required maxLength={200} style={{ width: '100%' }} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Message</label>
                  <RichTextarea value={editBody} onChange={setEditBody} required maxLength={5000} rows={5} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={editSaving}>
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div style={{ lineHeight: 1.6 }}>{renderRichText(post.body)}</div>
            )}
            <ReactionBar rows={post.reactions || []} currentUserId={user?.id} onReact={reactToPost} />
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
        {post.replies?.map((r: any) => {
          const isReplyOwner = user && user.id === r.author?.id
          const isEditingThis = editingReplyId === r.id
          return (
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
                  <div className="text-xs text-muted mb-1" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Link to={`/profile/${r.author?.id}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      {r.author?.profile?.displayName}
                    </Link>
                    <span>· {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
                    {r.editedAt && <span style={{ fontStyle: 'italic' }}>· edited</span>}
                    {isReplyOwner && !isEditingThis && (
                      <>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '0 6px', fontSize: 11 }}
                          onClick={() => { setEditingReplyId(r.id); setEditReplyBody(r.body) }}
                        >Edit</button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '0 6px', fontSize: 11, color: 'var(--red, #c00)' }}
                          onClick={async () => {
                            if (!confirm('Delete this reply?')) return
                            await api.deleteForumReply(r.id)
                            const fresh = await api.getForumPost(post.id)
                            setPost(fresh)
                          }}
                        >Delete</button>
                      </>
                    )}
                    {canModerate && !isReplyOwner && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0 6px', fontSize: 11, color: 'var(--red, #c00)' }}
                        onClick={async () => {
                          if (!confirm('Delete this reply (mod action)?')) return
                          await api.deleteForumReply(r.id)
                          const fresh = await api.getForumPost(post.id)
                          setPost(fresh)
                        }}
                      >Delete</button>
                    )}
                    {user && !isReplyOwner && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0 6px', fontSize: 11 }}
                        onClick={() => setReporting({ kind: 'reply', id: r.id })}
                      >Report</button>
                    )}
                  </div>
                  {isEditingThis ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        await api.editForumReply(r.id, editReplyBody)
                        const fresh = await api.getForumPost(post.id)
                        setPost(fresh)
                        setEditingReplyId(null)
                      }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                    >
                      <RichTextarea
                        value={editReplyBody}
                        onChange={setEditReplyBody}
                        required
                        maxLength={2000}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="btn btn-primary btn-sm">Save</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingReplyId(null)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="text-sm" style={{ lineHeight: 1.6 }}>{renderRichText(r.body)}</div>
                  )}
                  <ReactionBar rows={r.reactions || []} currentUserId={user?.id} onReact={(e) => reactToReply(r.id, e)} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {user ? (
        <div className="card">
          <form onSubmit={handleReply} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label className="form-label">Reply</label>
            <RichTextarea
              value={replyBody}
              onChange={setReplyBody}
              placeholder="Write a reply... mention with @name"
              required
              maxLength={2000}
              rows={3}
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

      {reporting && (
        <ReportDialog
          onClose={() => setReporting(null)}
          onSubmit={async (category, details) => {
            if (reporting.kind === 'post') {
              await api.reportForumPost(reporting.id, category, details)
            } else {
              await api.reportForumReply(reporting.id, category, details)
            }
          }}
        />
      )}
    </div>
  )
}
