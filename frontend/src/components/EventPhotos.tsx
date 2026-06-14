import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { compressImage } from '../lib/imageCompress'
import PhotoLightbox from './PhotoLightbox'

// Photo gallery for a challenge event: view, slideshow, and (signed-in) upload.
// Uploads are compressed to JPEG in the browser before sending.
export default function EventPhotos({ eventId, canManage }: { eventId: string; canManage: boolean }) {
  const { user } = useAuth()
  const [photos, setPhotos] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => { api.getEventPhotos(eventId).then(setPhotos).catch(() => {}) }
  useEffect(load, [eventId])

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const arr = Array.from(files)
    setBusy(true); setError('')
    let failed = 0
    for (let i = 0; i < arr.length; i++) {
      setProgress(`Uploading ${i + 1} of ${arr.length}…`)
      try {
        const { blob, width, height } = await compressImage(arr[i])
        const name = arr[i].name.replace(/\.[^.]+$/, '') + '.jpg'
        await api.uploadEventPhoto(eventId, blob, name, width, height)
      } catch {
        failed++
      }
    }
    if (failed) setError(`${failed} photo${failed > 1 ? 's' : ''} couldn't be uploaded.`)
    setBusy(false); setProgress('')
    if (fileRef.current) fileRef.current.value = ''
    load()
  }

  const del = async (photoId: string) => {
    if (!confirm('Delete this photo?')) return
    try {
      await api.deleteEventPhoto(eventId, photoId)
      setPhotos(p => p.filter(x => x.id !== photoId))
    } catch (e: any) {
      setError(e.message || 'Could not delete the photo')
    }
  }

  const canEditPhoto = (p: any) => canManage || p.uploadedBy === user?.id
  const saveCaption = async (photoId: string, caption: string) => {
    await api.updateEventPhotoCaption(eventId, photoId, caption)
    setPhotos(prev => prev.map(x => x.id === photoId ? { ...x, caption } : x))
  }

  return (
    <div className="card mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ margin: 0 }}>📸 Photos{photos.length > 0 ? ` (${photos.length})` : ''}</h3>
        <div className="flex gap-2">
          {photos.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setLightbox(0)}>▶ Slideshow</button>}
          {user && (
            <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? (progress || 'Uploading…') : '+ Add photos'}
            </button>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => onFiles(e.target.files)} />
      {error && <div className="text-sm" style={{ color: 'var(--red)', marginBottom: 8 }}>{error}</div>}
      {photos.length === 0 ? (
        <p className="text-sm text-muted">
          No photos yet. {user ? 'Add any you took at the event!' : 'Sign in to add photos.'}
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 8 }}>
          {photos.map((p, i) => {
            const canDelete = canManage || p.uploadedBy === user?.id
            return (
              <div key={p.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: 'var(--bg3)' }}>
                <img
                  src={p.url} alt={p.caption || ''} loading="lazy"
                  onClick={() => setLightbox(i)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                />
                {canDelete && (
                  <button
                    onClick={() => del(p.id)} title="Delete photo"
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', fontSize: 12, lineHeight: 1 }}
                  >✕</button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {lightbox !== null && (
        <PhotoLightbox
          photos={photos}
          startIndex={lightbox}
          onClose={() => setLightbox(null)}
          canEdit={canEditPhoto}
          onSaveCaption={saveCaption}
        />
      )}
    </div>
  )
}
