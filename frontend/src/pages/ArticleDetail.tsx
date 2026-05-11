import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { renderRichText } from '../lib/forumUtils'
import { format } from 'date-fns'
import { copyText, getInitials } from '../lib/utils'
import { useAuth } from '../store/auth'
import ArticleComments from '../components/ArticleComments'

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const [article, setArticle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [liking, setLiking] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const viewedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true); setNotFound(false)
    api.getArticleBySlug(slug)
      .then(setArticle)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  // Increment the view count once per article load.
  useEffect(() => {
    if (!article?.id) return
    if (viewedRef.current === article.id) return
    viewedRef.current = article.id
    api.incrementArticleView(article.id)
      .then(({ viewCount }) => {
        setArticle((prev: any) => prev && prev.id === article.id ? { ...prev, viewCount } : prev)
      })
      .catch(() => {})
  }, [article?.id])

  const handleLike = async () => {
    if (!user || !article || liking) return
    setLiking(true)
    try {
      const { liked, count } = await api.toggleArticleLike(article.id)
      setArticle((prev: any) => ({
        ...prev,
        likedByMe: liked,
        _count: { ...(prev._count || {}), likes: count },
      }))
    } catch { /* ignore */ }
    finally { setLiking(false) }
  }

  const handleShare = async () => {
    if (!article) return
    const url = `${window.location.origin}/articles/${article.slug}`
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, text: article.excerpt || article.title, url })
        return
      }
      await copyText(url)
      setShareStatus('copied')
      setTimeout(() => setShareStatus('idle'), 2000)
    } catch {
      setShareStatus('error')
      setTimeout(() => setShareStatus('idle'), 2000)
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

  const likeCount = article._count?.likes ?? 0
  const viewCount = article.viewCount ?? 0
  const likedByMe = !!article.likedByMe

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
            <span>·</span>
            <span title={`${viewCount} ${viewCount === 1 ? 'view' : 'views'}`}>
              👁 {viewCount.toLocaleString()}
            </span>
          </div>
          <div style={{ fontSize: '1.05rem', lineHeight: 1.7 }}>
            {renderRichText(article.body)}
          </div>

          <div
            className="flex gap-2 items-center"
            style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}
          >
            <button
              type="button"
              onClick={handleLike}
              disabled={!user || liking}
              title={user ? (likedByMe ? 'Remove like' : 'Like this article') : 'Sign in to like'}
              style={{
                border: likedByMe ? '1.5px solid var(--accent)' : '1px solid var(--gray-200, #e5e5e5)',
                background: likedByMe ? 'var(--accent-dim)' : 'transparent',
                color: likedByMe ? 'var(--accent)' : 'inherit',
                borderRadius: 999,
                padding: '6px 14px',
                fontSize: 14,
                fontWeight: 600,
                cursor: user && !liking ? 'pointer' : 'not-allowed',
                opacity: user ? 1 : 0.6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>👍</span>
              <span>{likeCount.toLocaleString()}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: 999, padding: '6px 14px', fontSize: 14 }}
              title="Share article"
            >
              🔗 {shareStatus === 'copied' ? 'Link copied!' : shareStatus === 'error' ? 'Copy failed' : 'Share'}
            </button>

            {!user && (
              <span className="text-xs text-muted" style={{ marginLeft: 4 }}>
                <Link to="/auth" style={{ color: 'var(--accent)' }}>Sign in</Link> to like.
              </span>
            )}
          </div>
        </div>
      </article>

      <ArticleComments articleId={article.id} />
    </div>
  )
}
