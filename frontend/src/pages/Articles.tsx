import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { format } from 'date-fns'
import { getInitials } from '../lib/utils'

const PAGE_SIZE = 10

export default function Articles() {
  const [articles, setArticles] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getArticles({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) })
      .then(r => { setArticles(r.articles); setTotal(r.total) })
      .finally(() => setLoading(false))
  }, [page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">ARTICLES</h1>
        <p className="page-subtitle">News, tips, and stories from the Salisbury tennis scene</p>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : articles.length === 0 ? (
        <div className="empty-state">
          <div className="icon" style={{ fontSize: 48 }}>📰</div>
          <h3>No articles yet</h3>
          <p>Check back soon — we'll be posting tournament updates, court news, and more.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {articles.map(a => (
            <Link key={a.id} to={`/articles/${a.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <article className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
                {a.coverImage && (
                  <img src={a.coverImage} alt="" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
                )}
                <div style={{ padding: 18 }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 6 }}>
                    {a.title}
                  </h2>
                  {a.excerpt && (
                    <p style={{ marginBottom: 10, color: 'var(--text2, #aaa)' }}>{a.excerpt}</p>
                  )}
                  <div className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', overflow: 'hidden',
                      background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--accent)',
                    }}>
                      {a.author?.profile?.photoUrl
                        ? <img src={a.author.profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : getInitials(a.author?.profile?.displayName || '?')
                      }
                    </div>
                    <span>{a.author?.profile?.displayName}</span>
                    <span>·</span>
                    <span>{format(new Date(a.publishedAt || a.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </article>
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
