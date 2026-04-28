import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { renderRichText, RichTextarea } from '../lib/forumUtils'

export default function AdminArticleEdit() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [published, setPublished] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  useEffect(() => {
    if (isNew) return
    api.adminGetArticle(id!).then(a => {
      setTitle(a.title)
      setSlug(a.slug)
      setExcerpt(a.excerpt || '')
      setBody(a.body)
      setCoverImage(a.coverImage || '')
      setPublished(a.published)
      setSlugTouched(true)
    }).finally(() => setLoading(false))
  }, [id, isNew])

  // Auto-generate slug from title until user manually edits it
  useEffect(() => {
    if (slugTouched) return
    const auto = title.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80)
    setSlug(auto)
  }, [title, slugTouched])

  const submit = async (publishNow?: boolean) => {
    setSaving(true); setError('')
    try {
      const data = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        excerpt: excerpt.trim(),
        body,
        coverImage: coverImage.trim() || null,
        published: publishNow !== undefined ? publishNow : published,
      }
      let result
      if (isNew) result = await api.adminCreateArticle(data)
      else result = await api.adminUpdateArticle(id!, data)
      navigate('/admin/articles')
    } catch (e: any) {
      setError(typeof e.message === 'string' ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page"><div className="loading-screen"><div className="spinner" /></div></div>

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">{isNew ? 'NEW ARTICLE' : 'EDIT ARTICLE'}</h1>
          <p className="page-subtitle">{isNew ? 'Write a new article' : 'Edit existing article'}</p>
        </div>
        <Link to="/admin/articles" className="btn btn-ghost btn-sm">← Articles</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <form onSubmit={e => { e.preventDefault(); submit() }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Article title"
                required
                maxLength={200}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Slug (URL)</label>
              <input
                value={slug}
                onChange={e => { setSlug(e.target.value); setSlugTouched(true) }}
                placeholder="article-slug"
                maxLength={120}
                style={{ width: '100%' }}
              />
              <div className="form-hint">URL: /articles/{slug || 'auto-generated'}</div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Cover Image URL (optional)</label>
              <input
                value={coverImage}
                onChange={e => setCoverImage(e.target.value)}
                placeholder="https://..."
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Excerpt (optional)</label>
              <textarea
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                placeholder="A short summary that shows up on the list page..."
                maxLength={500}
                rows={2}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Body</label>
              <RichTextarea
                value={body}
                onChange={setBody}
                placeholder="Write the article body..."
                required
                rows={16}
              />
            </div>

            <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={published}
                onChange={e => setPublished(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <span>Published (visible on the public articles page)</span>
            </label>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="flex gap-2 flex-wrap">
              <button type="submit" className="btn btn-primary" disabled={saving || !title || !body}>
                {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
              </button>
              {!published && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving || !title || !body}
                  onClick={() => submit(true)}
                >
                  Save & Publish
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => setShowPreview(p => !p)}>
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
            </div>
          </form>
        </div>

        {showPreview && (
          <div className="card" style={{ padding: 16, overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
            <div className="text-xs text-muted" style={{ marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Preview</div>
            {coverImage && <img src={coverImage} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 4, marginBottom: 12 }} />}
            <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 6 }}>{title || 'Untitled'}</h1>
            {excerpt && <p style={{ color: 'var(--text2, #aaa)', fontStyle: 'italic', marginBottom: 12 }}>{excerpt}</p>}
            <div style={{ lineHeight: 1.7 }}>{renderRichText(body)}</div>
          </div>
        )}
      </div>
    </div>
  )
}
