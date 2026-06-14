import { useEffect, useState, type CSSProperties } from 'react'

type Photo = { id: string; url: string; caption?: string; uploaderName?: string }

const navBase: CSSProperties = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
  fontSize: 38, color: '#fff', background: 'rgba(0,0,0,0.4)', border: 'none',
  borderRadius: '50%', width: 54, height: 54, cursor: 'pointer', lineHeight: 1
}

// Full-screen photo viewer with prev/next and an optional auto-advancing slideshow.
export default function PhotoLightbox({ photos, startIndex, onClose }: { photos: Photo[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex)
  const [playing, setPlaying] = useState(false)
  const count = photos.length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + count) % count)
      else if (e.key === 'ArrowRight') setIdx(i => (i + 1) % count)
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count, onClose])

  useEffect(() => {
    if (!playing || count < 2) return
    const t = setInterval(() => setIdx(i => (i + 1) % count), 3500)
    return () => clearInterval(t)
  }, [playing, count])

  if (count === 0) return null
  const p = photos[Math.min(idx, count - 1)]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center justify-between" style={{ padding: 12, color: '#fff' }} onClick={e => e.stopPropagation()}>
        <span className="text-sm">{idx + 1} / {count}</span>
        <div className="flex gap-2">
          {count > 1 && (
            <button className="btn btn-ghost btn-sm" style={{ color: '#fff' }} onClick={() => setPlaying(v => !v)}>
              {playing ? '⏸ Pause' : '▶ Slideshow'}
            </button>
          )}
          <button className="btn btn-ghost btn-sm" style={{ color: '#fff' }} onClick={onClose}>✕ Close</button>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 0 }} onClick={e => e.stopPropagation()}>
        {count > 1 && <button onClick={() => setIdx(i => (i - 1 + count) % count)} style={{ ...navBase, left: 8 }}>‹</button>}
        <img src={p.url} alt={p.caption || ''} style={{ maxWidth: '94vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 8 }} />
        {count > 1 && <button onClick={() => setIdx(i => (i + 1) % count)} style={{ ...navBase, right: 8 }}>›</button>}
      </div>
      <div style={{ padding: 12, textAlign: 'center', color: '#ccc', minHeight: 28 }} onClick={e => e.stopPropagation()}>
        {p.caption && <div>{p.caption}</div>}
        {p.uploaderName && <div className="text-xs" style={{ color: '#888' }}>by {p.uploaderName}</div>}
      </div>
    </div>
  )
}
