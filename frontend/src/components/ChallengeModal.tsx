import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import LocationBadge from './LocationBadge'

interface Props {
  targetUserId: string
  targetName: string
  onClose: () => void
}

export default function ChallengeModal({ targetUserId, targetName, onClose }: Props) {
  const navigate = useNavigate()
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    locationId: '',
    proposedTime: `${today}T18:00`,
    proposedEndTime: `${today}T20:00`,
    format: 'singles',
    stakes: 'casual',
    message: ''
  })

  useEffect(() => { api.getLocations().then(setLocations) }, [])

  const setField = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }))
  const selectedLocation = locations.find((l: any) => l.id === form.locationId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.createChallenge({
        challengedId: targetUserId,
        locationId: form.locationId,
        proposedTime: new Date(form.proposedTime).toISOString(),
        proposedEndTime: new Date(form.proposedEndTime).toISOString(),
        format: form.format,
        stakes: form.stakes,
        message: form.message
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#9876;</div>
            <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 8 }}>CHALLENGE SENT!</h2>
            <p className="text-muted mb-4">
              Your challenge to <strong>{targetName}</strong> has been sent. They'll see it in their challenge inbox.
            </p>
            <div className="flex gap-2 justify-center">
              <button className="btn btn-primary" onClick={() => navigate('/challenges')}>View Challenges</button>
              <button className="btn btn-ghost" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title">&#9876; Challenge {targetName}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>&#10005;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="ch-location">Location *</label>
            <select id="ch-location" value={form.locationId} onChange={e => setField('locationId', e.target.value)} required>
              <option value="">Select location...</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.lighted ? '(Lighted)' : '(No lights)'} - {l.courtCount} courts
                </option>
              ))}
            </select>
            {selectedLocation && (
              <div className="mt-2">
                <LocationBadge lighted={selectedLocation.lighted} compact />
              </div>
            )}
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="ch-start">Start Time *</label>
              <input id="ch-start" type="datetime-local" value={form.proposedTime} onChange={e => setField('proposedTime', e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="ch-end">End Time *</label>
              <input id="ch-end" type="datetime-local" value={form.proposedEndTime} onChange={e => setField('proposedEndTime', e.target.value)} required style={{ width: '100%' }} />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="ch-format">Format *</label>
              <select id="ch-format" value={form.format} onChange={e => setField('format', e.target.value)} style={{ width: '100%' }}>
                <option value="singles">Singles</option>
                <option value="doubles">Doubles</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="ch-stakes">Stakes</label>
              <select id="ch-stakes" value={form.stakes} onChange={e => setField('stakes', e.target.value)} style={{ width: '100%' }}>
                <option value="casual">Casual</option>
                <option value="competitive">Competitive</option>
                <option value="practice">Practice</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="ch-message">Message (optional)</label>
            <textarea
              id="ch-message"
              value={form.message}
              onChange={e => setField('message', e.target.value)}
              placeholder="e.g. Looking forward to a good match! I'll bring balls."
              maxLength={300}
              rows={2}
            />
          </div>

          {error && <div className="alert alert-danger mb-3">{error}</div>}

          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={loading || !form.locationId} style={{ flex: 1 }}>
              {loading ? 'Sending...' : 'Send Challenge'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
