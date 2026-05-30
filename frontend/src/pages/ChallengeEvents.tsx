import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { formatDateTime } from '../lib/utils'

const SCORING_LABELS: Record<string, string> = {
  first_to_4: 'First to 4 games',
  pro_set_8: '8-game pro set',
  tb_7: '7-point tiebreak',
  tb_10: '10-point tiebreak'
}

export default function ChallengeEvents() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: 'Saturday Summer Challenge',
    locationId: '',
    date: '',
    format: 'doubles',
    mode: 'rotating',
    rotation: 'americano',
    courts: 2,
    scoring: 'first_to_4',
    pointsPerWin: 1,
    affectsElo: true,
    maxHillWins: 3
  })

  const load = () => {
    setLoading(true)
    api.getChallengeEvents().then(e => { setEvents(e); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.getLocations().then(setLocations).catch(() => {})
  }, [])

  const create = async () => {
    setError('')
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.locationId) { setError('Pick a location'); return }
    if (!form.date) { setError('Pick a date & time'); return }
    setSaving(true)
    try {
      const payload: any = {
        name: form.name.trim(),
        locationId: form.locationId,
        date: new Date(form.date).toISOString(),
        format: form.format,
        mode: form.mode,
        rotation: form.rotation,
        courts: Number(form.courts),
        scoring: form.scoring,
        pointsPerWin: Number(form.pointsPerWin),
        affectsElo: form.affectsElo,
        maxHillWins: form.mode === 'king_of_hill' ? Number(form.maxHillWins) : null
      }
      const ev = await api.createChallengeEvent(payload)
      setShowCreate(false)
      navigate(`/challenge-events/${ev.id}`)
    } catch (e: any) {
      setError(e.message || 'Failed to create event')
    } finally {
      setSaving(false)
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { setup: 'badge-orange', active: 'badge-green', completed: 'badge-gray' }
    return map[status] || 'badge-gray'
  }

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">CHALLENGE EVENTS</h1>
          <p className="page-subtitle">Saturday round-robins & king-of-the-hill challenges</p>
        </div>
        {user && <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Event</button>}
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="icon" style={{ fontSize: 48 }}>🎾</div>
          <h3>No challenge events yet</h3>
          <p>Create a Saturday Challenge and invite players to a fast, rotating format.</p>
          {user && <button className="btn btn-primary mt-4" onClick={() => setShowCreate(true)}>Create Event</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.map(e => (
            <div key={e.id} className="card clickable" style={{ cursor: 'pointer' }} onClick={() => navigate(`/challenge-events/${e.id}`)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-2 items-center">
                  <span className={`badge ${statusBadge(e.status)}`}>{e.status}</span>
                  <span className={`badge ${e.format === 'singles' ? 'badge-blue' : 'badge-orange'}`}>{e.format}</span>
                  <span className="badge badge-gray">{e.mode === 'king_of_hill' ? 'King of the Hill' : e.rotation}</span>
                </div>
                <span className="text-xs text-muted">{e._count?.participants ?? 0} players</span>
              </div>
              <div className="font-bold" style={{ fontSize: 17 }}>{e.name}</div>
              <div className="session-meta mt-2">
                <span>📍 {e.location?.name}</span>
                <span>🕐 {formatDateTime(e.date)}</span>
                <span>🎾 {e.courts} court{e.courts > 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={ev => ev.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="modal-title">New Challenge Event</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button>
            </div>

            <div className="form-group">
              <label>Event name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={120} />
            </div>

            <div className="form-group">
              <label>Location</label>
              <select value={form.locationId} onChange={e => setForm({ ...form, locationId: e.target.value })}>
                <option value="">Select a location...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Date & time</label>
              <input type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>

            <div className="flex gap-2">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Match type</label>
                <select value={form.format} onChange={e => setForm({ ...form, format: e.target.value })}>
                  <option value="singles">Singles</option>
                  <option value="doubles">Doubles</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Courts</label>
                <input type="number" min={1} max={12} value={form.courts} onChange={e => setForm({ ...form, courts: Number(e.target.value) })} />
              </div>
            </div>

            <div className="form-group">
              <label>Format</label>
              <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
                <option value="rotating">Rotating rounds (everyone plays each round)</option>
                <option value="king_of_hill">King of the Hill (winners stay on)</option>
              </select>
            </div>

            {form.mode === 'rotating' ? (
              <div className="form-group">
                <label>Rotation style</label>
                <select value={form.rotation} onChange={e => setForm({ ...form, rotation: e.target.value })}>
                  <option value="americano">Americano (random each round)</option>
                  <option value="mexicano">Mexicano (pair by standings to keep games close)</option>
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label>Max wins before rotating off</label>
                <input type="number" min={1} max={20} value={form.maxHillWins} onChange={e => setForm({ ...form, maxHillWins: Number(e.target.value) })} />
              </div>
            )}

            <div className="flex gap-2">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Scoring</label>
                <select value={form.scoring} onChange={e => setForm({ ...form, scoring: e.target.value })}>
                  {Object.entries(SCORING_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Points per win</label>
                <input type="number" min={1} max={10} value={form.pointsPerWin} onChange={e => setForm({ ...form, pointsPerWin: Number(e.target.value) })} />
              </div>
            </div>

            <div className="form-group">
              <label className="flex gap-2 items-center" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={form.affectsElo} onChange={e => setForm({ ...form, affectsElo: e.target.checked })} style={{ width: 'auto' }} />
                Count results toward Elo rankings
              </label>
            </div>

            {error && <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>}

            <div className="flex gap-2 mt-2">
              <button className="btn btn-primary" onClick={create} disabled={saving}>{saving ? 'Creating...' : 'Create Event'}</button>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
