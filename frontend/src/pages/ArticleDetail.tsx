import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { renderRichText, REACTION_EMOJIS, summarizeReactions } from '../lib/forumUtils'
import { format } from 'date-fns'
import { getInitials } from '../lib/utils'

function ArticleReactionBar({
  rows, currentUserId, onReact,
}: { rows: any[]; currentUserId?: string; onReact: (emoji: string) => void }) {
  const summary = summarizeReactions(rows, currentUserId)
  const [showPicker, setShowPicker] = useState(false)
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {summary.map(r => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onReact(r.emoji)}
          style={{
            border: r.mine ? '1.5px solid var(--accent)' : '1px solid var(--gray-200, #e5e5e5)',
            background: r.mine ? 'var(--accent-dim)' : 'transparent',
            borderRadius: 14,
            padding: '4px 12px',
            fontSize: 14,
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
              padding: '4px 12px',
              fontSize: 14,
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
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20, padding: '4px 6px' }}
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

function ShareButton({ article }: { article: any }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const shareData = {
      title: article.title,
      text: article.excerpt || article.title,
      url,
    }
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share(shareData)
        return
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        return
      }
      setError('Sharing not supported')
      setTimeout(() => setError(''), 2500)
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setError('Could not share')
      setTimeout(() => setError(''), 2500)
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={handleShare}
        className="btn btn-secondary btn-sm"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <span aria-hidden>🔗</span>
        <span>Share</span>
      </button>
      {copied && <span className="text-xs" style={{ color: 'var(--accent)' }}>Link copied!</span>}
      {error && <span className="text-xs" style={{ color: 'var(--red, #c00)' }}>{error}</span>}
    </div>
  )
}

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const [article, setArticle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true); setNotFound(false)
    api.getArticleBySlug(slug)
      .then(setArticle)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  const handleReact = async (emoji: string) => {
    if (!article || !user) return
    const prev = article.reactions || []
    const mineSame = prev.find((r: any) => r.userId === user.id && r.emoji === emoji)
    const optimistic = mineSame
      ? prev.filter((r: any) => !(r.userId === user.id && r.emoji === emoji))
      : [...prev, { userId: user.id, emoji }]
    setArticle({ ...article, reactions: optimistic })
    try {
      await api.reactToArticle(article.id, emoji)
    } catch {
      setArticle({ ...article, reactions: prev })
    }
  }

  if (loading) return <div className="page"><div className="loading-screen"><div className="spinner" /></div></div>
  if (notFound || !article) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="icon">📰</div>
          <h3>Article not found</h3>
          <Link to="/articles" className="btn btn-secondary btn-sm">All Articles</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Link to="/articles" className="btn btn-ghost btn-sm mb-4">← All Articles</Link>

      <article className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {article.coverImage && (
          <img src={article.coverImage} alt="" style={{ width: '100%', maxHeight: 380, objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{ padding: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 8 }}>
            {article.title}
          </h1>
          {article.excerpt && (
            <p style={{ fontSize: '1.05rem', color: 'var(--text2, #aaa)', marginBottom: 16, fontStyle: 'italic' }}>
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted mb-4" style={{ paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
              background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontFamily: 'var(--font-display)', color: 'var(--accent)',
            }}>
              {article.author?.profile?.photoUrl
                ? <img src={article.author.profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : getInitials(article.author?.profile?.displayName || '?')
              }
            </div>
            <span>{article.author?.profile?.displayName}</span>
            <span>·</span>
            <span>{format(new Date(article.publishedAt || article.createdAt), 'MMMM d, yyyy')}</span>
          </div>
          <div style={{ fontSize: '1.05rem', lineHeight: 1.7 }}>
            {renderRichText(article.body)}
          </div>

          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {user ? (
              <ArticleReactionBar
                rows={article.reactions || []}
                currentUserId={user.id}
                onReact={handleReact}
              />
            ) : (
              <div className="text-xs text-muted">
                {(article.reactions || []).length > 0 && (
                  <ArticleReactionBar rows={article.reactions} onReact={() => {}} />
                )}
                {(article.reactions || []).length === 0 && (
                  <>
                    <Link to="/auth" style={{ color: 'var(--accent)' }}>Sign in</Link> to react
                  </>
                )}
              </div>
            )}
            <ShareButton article={article} />
          </div>
        </div>
      </article>
    </div>
  )
}
