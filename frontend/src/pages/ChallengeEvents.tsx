import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { formatDate, formatTime } from '../lib/utils'

// Shortest formats first. `scoring` is just the format players are told to play
// to — you enter the final score and points tally from it either way.
const SCORING_LABELS: Record<string, string> = {
  tb_7: '7-point tiebreaker',
  tb_10: '10-point tiebreaker',
  first_to_3: 'First to 3 games',
  first_to_4: 'First to 4 games',
  first_to_6: '6-game set',
  pro_set_8: '8-game pro set'
}

// Local <input type="datetime-local"> value for a date at a given hour.
function localInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function nextSaturdayAt(hour: number): string {
  const d = new Date()
  const day = d.getDay() // 0 Sun ... 6 Sat
  const add = (6 - day + 7) % 7 || 7 // always the upcoming Saturday
  d.setDate(d.getDate() + add)
  d.setHours(hour, 0, 0, 0)
  return localInput(d)
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
    date: nextSaturdayAt(10),
    endTime: nextSaturdayAt(20),
    format: 'doubles',
    mode: 'rotating',
    rotation: 'americano',
    courts: 4,
    scoring: 'first_to_4',
    pointsPerWin: 1,
    affectsElo: true,
    maxHillWins: 3
  })

  const isAdmin = !!user?.isAdmin

  const load = () => {
    setLoading(true)
    api.getChallengeEvents().then(e => { setEvents(e); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.getLocations().then(locs => {
      setLocations(locs)
      // Default to City Park when available.
      const cityPark = locs.find((l: any) => /city park/i.test(l.name)) || locs[0]
      if (cityPark) setForm(f => ({ ...f, locationId: f.locationId || cityPark.id }))
    }).catch(() => {})
  }, [])

  const timeWindow = (e: any) => e.endTime
    ? `${formatTime(e.date)} – ${formatTime(e.endTime)}`
    : formatTime(e.date)

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
        endTime: form.endTime ? new Date(form.endTime).toISOString() : null,
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

  const upcoming = events.filter(e => e.status !== 'completed')
  const past = events.filter(e => e.status === 'completed')

  const canEdit = (e: any) => !!user && (e.createdBy === user.id || user.isAdmin) && e.status !== 'completed'

  const renderCard = (e: any) => (
    <div key={e.id} className="card clickable" style={{ cursor: 'pointer' }} onClick={() => navigate(`/challenge-events/${e.id}`)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2 items-center">
          <span className={`badge ${statusBadge(e.status)}`}>{e.status === 'completed' ? 'final' : e.status}</span>
          <span className={`badge ${e.format === 'singles' ? 'badge-blue' : 'badge-orange'}`}>{e.format}</span>
          <span className="badge badge-gray">{e.mode === 'king_of_hill' ? 'King of the Hill' : e.rotation}</span>
        </div>
        <div className="flex gap-2 items-center">
          {canEdit(e) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={ev => { ev.stopPropagation(); navigate(`/challenge-events/${e.id}?edit=1`) }}
            >
              ✎ Edit
            </button>
          )}
          <span className="text-xs text-muted">{e._count?.participants ?? 0} players</span>
        </div>
      </div>
      <div className="font-bold" style={{ fontSize: 17 }}>{e.name}</div>
      <div className="session-meta mt-2">
        <span>📍 {e.location?.name}</span>
        <span>📅 {formatDate(e.date)}</span>
        <span>🕐 {timeWindow(e)}</span>
        <span>🎾 {e.courts} court{e.courts > 1 ? 's' : ''}</span>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">CHALLENGE EVENTS</h1>
          <p className="page-subtitle">Saturday round-robins & king-of-the-hill challenges</p>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Event</button>}
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="icon" style={{ fontSize: 48 }}>🎾</div>
          <h3>No challenge events yet</h3>
          <p>{isAdmin
            ? 'Create a Saturday Challenge and invite players to a fast, rotating format.'
            : 'Check back soon — organizers post upcoming Saturday Challenges here.'}</p>
          {isAdmin && <button className="btn btn-primary mt-4" onClick={() => setShowCreate(true)}>Create Event</button>}
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-4">
              <h2 className="section-title">UPCOMING & LIVE</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {upcoming.map(renderCard)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div className="mb-4">
              <h2 className="section-title">🏆 PAST EVENTS</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {past.map(renderCard)}
              </div>
            </div>
          )}
        </>
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

            <div className="flex gap-2">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Starts</label>
                <input type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Ends</label>
                <input type="datetime-local" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
              </div>
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
                <input type="number" min={1} max={16} value={form.courts} onChange={e => setForm({ ...form, courts: Number(e.target.value) })} />
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
                <label>Points per game won</label>
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
