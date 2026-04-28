import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { renderRichText } from '../lib/forumUtils'
import { format } from 'date-fns'
import { getInitials } from '../lib/utils'

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>()
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
        </div>
      </article>
    </div>
  )
}
