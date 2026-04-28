import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { format } from 'date-fns'

export default function AdminArticles() {
  const navigate = useNavigate()
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.adminGetAllArticles().then(setArticles).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const togglePublish = async (a: any) => {
    await api.adminToggleArticlePublish(a.id)
    load()
  }

  const deleteArticle = async (a: any) => {
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return
    await api.adminDeleteArticle(a.id)
    load()
  }

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">ARTICLES</h1>
          <p className="page-subtitle">Manage published articles and drafts</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin" className="btn btn-ghost btn-sm">← Admin</Link>
          <button className="btn btn-primary" onClick={() => navigate('/admin/articles/new')}>+ New Article</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : articles.length === 0 ? (
        <div className="empty-state">
          <div className="icon" style={{ fontSize: 48 }}>📰</div>
          <h3>No articles yet</h3>
          <p>Write your first article to get started.</p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/articles/new')}>Write an Article</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {articles.map(a => (
            <div key={a.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {a.coverImage && (
                  <img src={a.coverImage} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    {a.published
                      ? <span className="badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>Published</span>
                      : <span className="badge badge-orange">Draft</span>
                    }
                    <span style={{ fontWeight: 700 }}>{a.title}</span>
                  </div>
                  {a.excerpt && <div className="text-sm text-muted" style={{ marginBottom: 4 }}>{a.excerpt}</div>}
                  <div className="text-xs text-muted">
                    /{a.slug} · {a.author?.profile?.displayName} · updated {format(new Date(a.updatedAt), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
                <div className="flex gap-2" style={{ flexShrink: 0 }}>
                  {a.published && (
                    <Link to={`/articles/${a.slug}`} className="btn btn-ghost btn-sm" target="_blank">View</Link>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/articles/${a.id}/edit`)}>Edit</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => togglePublish(a)}>
                    {a.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteArticle(a)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
