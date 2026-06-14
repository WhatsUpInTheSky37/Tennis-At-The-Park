import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { format } from 'date-fns'

export default function Gallery() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getEventGallery()
      .then(e => { setEvents(e); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">PHOTO GALLERY</h1>
        <p className="page-subtitle">Photos from our challenge events</p>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="icon" style={{ fontSize: 48 }}>📸</div>
          <h3>No event photos yet</h3>
          <p>Photos uploaded to a challenge event will show up here — open an event and add yours.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {events.map(e => (
            <Link key={e.id} to={`/challenge-events/${e.id}#photos`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ aspectRatio: '4 / 3', background: 'var(--bg3)' }}>
                  {e.cover && <img src={e.cover} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                </div>
                <div style={{ padding: 12 }}>
                  <div className="font-bold" style={{ lineHeight: 1.3 }}>{e.name}</div>
                  <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                    {format(new Date(e.date), 'MMM d, yyyy')}{e.location?.name ? ` · ${e.location.name}` : ''} · 📸 {e.photoCount}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
