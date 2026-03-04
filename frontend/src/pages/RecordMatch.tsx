import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'

export default function RecordMatch() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [locations, setLocations] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const today = new Date().toISOString().slice(0, 16)

  const [form, setForm] = useState({
    locationId: '',
    playedAt: today,
    format: 'singles',
    opponent1: '',
    sets: [{ myScore: '', oppScore: '' }, { myScore: '', oppScore: '' }, { myScore: '', oppScore: '' }],
    activeSets: 2,
    retiredFlag: false,
    timeRanOutFlag: false,
    notes: ''
  })
  const [winner, setWinner] = useState<'me' | 'opponent' | ''>('')

  useEffect(() => {
    api.getLocations().then(setLocations)
    api.getPlayers().then(setPlayers).catch(() => {})
  }, [])

  const setField = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const setSetScore = (i: number, side: 'myScore' | 'oppScore', val: string) => {
    setForm(f => { const sets = [...f.sets]; sets[i] = { ...sets[i], [side]: val }; return { ...f, sets } })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!winner) { setError('Select who won'); return }
    if (!form.opponent1) { setError('Select an opponent'); return }
    setLoading(true); setError('')

    const sets = form.sets.slice(0, form.activeSets).filter(s => s.myScore !== '' || s.oppScore !== '')
    const scoreJson = sets.map(s => [parseInt(s.myScore || '0'), parseInt(s.oppScore || '0')])
    const myId = user!.id
    const oppId = form.opponent1
    const winnerId = winner === 'me' ? myId : oppId

    try {
      await api.createMatch({
        locationId: form.locationId,
        playedAt: new Date(form.playedAt).toISOString(),
        format: form.format,
        teamsJson: { team1: [myId], team2: [oppId] },
        scoreJson,
        winnerUserIdsJson: [winnerId],
        retiredFlag: form.retiredFlag,
        timeRanOutFlag: form.timeRanOutFlag,
        notes: form.notes
      })
      navigate('/matches')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="page-header">
        <h1 className="page-title">RECORD MATCH</h1>
        <p className="page-subtitle">Log match results honestly within 24 hours</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card mb-4">
          <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 16 }}>MATCH INFO</h3>
          <div className="grid-2">
            <div className="form-group">
              <label htmlFor="location">Location *</label>
              <select id="location" value={form.locationId} onChange={e => setField('locationId', e.target.value)} required>
                <option value="">Select…</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="playedAt">Date & Time *</label>
              <input id="playedAt" type="datetime-local" value={form.playedAt} onChange={e => setField('playedAt', e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="format">Format *</label>
            <select id="format" value={form.format} onChange={e => setField('format', e.target.value)}>
              <option value="singles">Singles</option>
              <option value="doubles">Doubles</option>
            </select>
          </div>
        </div>

        <div className="card mb-4">
          <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 16 }}>PLAYERS</h3>
          <div className="flex items-center gap-3 mb-2">
            <div className="participant-chip" style={{ padding: '8px 14px', background: 'var(--accent-dim)', borderColor: 'var(--accent)' }}>
              {user?.profile?.displayName || user?.email} <span style={{ fontSize: 10, marginLeft: 4, color: 'var(--accent)' }}>you</span>
            </div>
            <span style={{ color: 'var(--text3)' }}>vs</span>
            <div className="form-group" style={{ margin: 0, flex: 1 }}>
              <select value={form.opponent1} onChange={e => setField('opponent1', e.target.value)} required>
                <option value="">Select opponent…</option>
                {players.filter(p => p.userId !== user?.id).map(p => (
                  <option key={p.userId} value={p.userId}>{p.displayName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1 }}>SCORE</h3>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setField('activeSets', Math.max(1, form.activeSets - 1))}>- Set</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setField('activeSets', Math.min(3, form.activeSets + 1))}>+ Set</button>
            </div>
          </div>
          <table className="score-table" style={{ marginBottom: 16 }}>
            <thead>
              <tr>
                <th>Player</th>
                {Array.from({ length: form.activeSets }, (_, i) => <th key={i}>Set {i + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 12 }}>{user?.profile?.displayName || 'You'}</td>
                {Array.from({ length: form.activeSets }, (_, i) => (
                  <td key={i}><input type="number" min={0} max={7} value={form.sets[i].myScore} onChange={e => setSetScore(i, 'myScore', e.target.value)} style={{ width: 50, textAlign: 'center', padding: '4px' }} /></td>
                ))}
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 12 }}>{players.find(p => p.userId === form.opponent1)?.displayName || 'Opponent'}</td>
                {Array.from({ length: form.activeSets }, (_, i) => (
                  <td key={i}><input type="number" min={0} max={7} value={form.sets[i].oppScore} onChange={e => setSetScore(i, 'oppScore', e.target.value)} style={{ width: 50, textAlign: 'center', padding: '4px' }} /></td>
                ))}
              </tr>
            </tbody>
          </table>

          <div className="form-group">
            <label>Winner *</label>
            <div className="flex gap-3">
              <button type="button" className={`btn ${winner === 'me' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setWinner('me')}>🏆 I won</button>
              <button type="button" className={`btn ${winner === 'opponent' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setWinner('opponent')}>🏆 Opponent won</button>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.retiredFlag} onChange={e => setField('retiredFlag', e.target.checked)} style={{ width: 'auto' }} />
              <span className="text-sm">Retirement</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.timeRanOutFlag} onChange={e => setField('timeRanOutFlag', e.target.checked)} style={{ width: 'auto' }} />
              <span className="text-sm">Time ran out</span>
            </label>
          </div>
        </div>

        <div className="card mb-4">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="notes">Match Notes</label>
            <textarea id="notes" value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Optional notes" maxLength={500} />
          </div>
        </div>

        {error && <div className="alert alert-danger mb-4">⚠️ {error}</div>}

        <div className="alert alert-info mb-4">
          ℹ️ Match will be <strong>pending confirmation</strong> until your opponent confirms.
        </div>

        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Submitting…' : '📊 Submit Match Result'}
        </button>
      </form>
    </div>
  )
}
