import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { isAfterDark } from '../lib/utils'
import DisclaimerBox from '../components/DisclaimerBox'
import LocationBadge from '../components/LocationBadge'

const AFTER_DARK_HOUR = 20

export default function CreateSession() {
  const navigate = useNavigate()
  const [locations, setLocations] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDarkWarning, setShowDarkWarning] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    locationId: '',
    startTime: `${today}T18:00`,
    endTime: `${today}T20:00`,
    format: 'singles',
    stakes: 'casual',
    levelMin: '3',
    levelMax: '4',
    notes: ''
  })

  useEffect(() => { api.getLocations().then(setLocations) }, [])

  const selectedLocation = locations.find(l => l.id === form.locationId)
  const isNight = isAfterDark(form.startTime + ':00', AFTER_DARK_HOUR) || isAfterDark(form.endTime + ':00', AFTER_DARK_HOUR)
  const isUnlit = selectedLocation && !selectedLocation.lighted

  const setField = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isNight && isUnlit && !confirmed) {
      setShowDarkWarning(true)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data: any = {
        locationId: form.locationId,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        format: form.format,
        stakes: form.stakes,
        levelMin: parseFloat(form.levelMin),
        levelMax: parseFloat(form.levelMax),
        notes: form.notes,
        flexibleCourt: true
      }
      const session = await api.createSession(data)
      navigate(`/sessions/${session.id}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="page-header">
        <h1 className="page-title">PLAN A SESSION</h1>
        <p className="page-subtitle">Coordinate a tennis meetup at a public court</p>
      </div>

      <DisclaimerBox showRotation />

      <form onSubmit={handleSubmit}>
        <div className="card mb-4">
          <h3 style={{ marginBottom: 16, fontFamily: 'var(--font-display)', letterSpacing: 1 }}>LOCATION</h3>

          <div className="form-group">
            <label htmlFor="location">Location *</label>
            <select id="location" value={form.locationId} onChange={e => setField('locationId', e.target.value)} required>
              <option value="">Select location…</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.lighted ? '💡 Lighted' : '🌙 No lights'} ({l.courtCount} courts)
                </option>
              ))}
            </select>
          </div>

          {selectedLocation && (
            <div className="alert alert-info">
              <LocationBadge lighted={selectedLocation.lighted} />
              <span style={{ marginLeft: 8 }}>
                {selectedLocation.courtCount} courts available · {selectedLocation.lighted
                  ? 'Night sessions allowed.'
                  : 'No lights — daytime only recommended.'}
              </span>
            </div>
          )}
        </div>

        <div className="card mb-4">
          <h3 style={{ marginBottom: 16, fontFamily: 'var(--font-display)', letterSpacing: 1 }}>DATE & TIME</h3>
          <div className="grid-2">
            <div className="form-group">
              <label htmlFor="start">Start Time *</label>
              <input id="start" type="datetime-local" value={form.startTime} onChange={e => setField('startTime', e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="end">End Time *</label>
              <input id="end" type="datetime-local" value={form.endTime} onChange={e => setField('endTime', e.target.value)} required />
            </div>
          </div>
          {isNight && isUnlit && (
            <div className="alert alert-warning">
              🌙 After-dark warning: Winterplace Park has no lights. Playing after {AFTER_DARK_HOUR}:00 is not recommended.
            </div>
          )}
        </div>

        <div className="card mb-4">
          <h3 style={{ marginBottom: 16, fontFamily: 'var(--font-display)', letterSpacing: 1 }}>MATCH DETAILS</h3>
          <div className="grid-2">
            <div className="form-group">
              <label htmlFor="format">Format *</label>
              <select id="format" value={form.format} onChange={e => setField('format', e.target.value)}>
                <option value="singles">Singles</option>
                <option value="doubles">Doubles</option>
                <option value="mixed">Mixed Doubles</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="stakes">Stakes</label>
              <select id="stakes" value={form.stakes} onChange={e => setField('stakes', e.target.value)}>
                <option value="casual">Casual / For fun</option>
                <option value="competitive">Competitive</option>
                <option value="practice">Practice only</option>
                <option value="drilling">Drilling / Skills</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label htmlFor="levelMin">Min NTRP Level *</label>
              <select id="levelMin" value={form.levelMin} onChange={e => setField('levelMin', e.target.value)}>
                {[1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="levelMax">Max NTRP Level *</label>
              <select id="levelMax" value={form.levelMax} onChange={e => setField('levelMax', e.target.value)}>
                {[1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="e.g. Bring a can of balls. Will warm up 10 mins before sets." maxLength={500} />
          </div>
        </div>

        {error && <div className="alert alert-danger mb-4">⚠️ {error}</div>}

        {showDarkWarning && (
          <div className="modal-backdrop" onClick={() => setShowDarkWarning(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">🌙 After-Dark Warning</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowDarkWarning(false)}>✕</button>
              </div>
              <div className="alert alert-warning mb-4">
                Winterplace Park Courts have <strong>no lighting</strong>. After-dark play is discouraged.
              </div>
              <div className="flex gap-3">
                <button className="btn btn-danger" onClick={() => { setConfirmed(true); setShowDarkWarning(false); setTimeout(() => document.querySelector<HTMLButtonElement>('form button[type=submit]')?.click(), 100) }}>
                  Yes, plan anyway
                </button>
                <button className="btn btn-secondary" onClick={() => setShowDarkWarning(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading || !form.locationId}>
          {loading ? 'Creating...' : '📅 Create Meetup Plan'}
        </button>
      </form>
    </div>
  )
}
