import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { getInitials } from '../lib/utils'

export default function RecordMatch() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [locations, setLocations] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const today = new Date().toISOString().slice(0, 16)

  // Step 1: Singles or Doubles
  const [format, setFormat] = useState<'singles' | 'doubles' | ''>('')

  const [form, setForm] = useState({
    locationId: '',
    playedAt: today,
    // Singles: opponent1
    opponent1: '',
    // Doubles: partner + opponent pair
    partner: '',
    opponent2: '',
    sets: [{ myScore: '', oppScore: '' }, { myScore: '', oppScore: '' }, { myScore: '', oppScore: '' }],
    numberOfSets: 0,
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

  const otherPlayers = players.filter(p => p.userId !== user?.id)

  // For doubles, filter out already-selected players
  const availableForPartner = otherPlayers.filter(p => p.userId !== form.opponent1 && p.userId !== form.opponent2)
  const availableForOpp1 = otherPlayers.filter(p => p.userId !== form.partner && p.userId !== form.opponent2)
  const availableForOpp2 = otherPlayers.filter(p => p.userId !== form.partner && p.userId !== form.opponent1)

  const getPlayerName = (id: string) => players.find(p => p.userId === id)?.displayName || 'Unknown'
  const getPlayerPhoto = (id: string) => players.find(p => p.userId === id)?.photoUrl || null

  const PlayerAvatar = ({ name, photo, size = 36 }: { name: string; photo?: string | null; size?: number }) => (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: 'var(--accent-dim)', flexShrink: 0 }}>
      {photo
        ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        : getInitials(name || '?')
      }
    </div>
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!format) { setError('Select singles or doubles'); return }
    if (!winner) { setError('Select who won'); return }
    if (!form.opponent1) { setError('Select an opponent'); return }
    if (format === 'doubles' && (!form.partner || !form.opponent2)) { setError('Select all players for doubles'); return }
    if (form.numberOfSets === 0) { setError('Select the number of sets played'); return }
    setLoading(true); setError('')

    const sets = form.sets.slice(0, form.numberOfSets).filter(s => s.myScore !== '' || s.oppScore !== '')
    const scoreJson = sets.map(s => [parseInt(s.myScore || '0'), parseInt(s.oppScore || '0')])
    const myId = user!.id

    let teamsJson: any
    let winnerUserIdsJson: string[]

    if (format === 'singles') {
      teamsJson = { team1: [myId], team2: [form.opponent1] }
      winnerUserIdsJson = winner === 'me' ? [myId] : [form.opponent1]
    } else {
      teamsJson = { team1: [myId, form.partner], team2: [form.opponent1, form.opponent2] }
      winnerUserIdsJson = winner === 'me' ? [myId, form.partner] : [form.opponent1, form.opponent2]
    }

    try {
      await api.createMatch({
        locationId: form.locationId,
        playedAt: new Date(form.playedAt).toISOString(),
        format,
        teamsJson,
        scoreJson,
        winnerUserIdsJson,
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

      {/* Step 1: Singles or Doubles */}
      <div className="card mb-4">
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 16 }}>MATCH TYPE</h3>
        <p className="text-sm text-muted" style={{ marginBottom: 12 }}>Was this a singles or doubles match?</p>
        <div className="flex gap-3">
          <button
            type="button"
            className={`btn ${format === 'singles' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setFormat('singles'); setForm(f => ({ ...f, partner: '', opponent2: '' })) }}
            style={{ flex: 1 }}
          >
            Singles (1v1)
          </button>
          <button
            type="button"
            className={`btn ${format === 'doubles' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFormat('doubles')}
            style={{ flex: 1 }}
          >
            Doubles (2v2)
          </button>
        </div>
      </div>

      {format && (
        <form onSubmit={handleSubmit}>
          {/* Match Info */}
          <div className="card mb-4">
            <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 16 }}>MATCH INFO</h3>
            <div className="grid-2">
              <div className="form-group">
                <label htmlFor="location">Location *</label>
                <select id="location" value={form.locationId} onChange={e => setField('locationId', e.target.value)} required>
                  <option value="">Select...</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="playedAt">Date & Time *</label>
                <input id="playedAt" type="datetime-local" value={form.playedAt} onChange={e => setField('playedAt', e.target.value)} required />
              </div>
            </div>
          </div>

          {/* Players */}
          <div className="card mb-4">
            <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 16 }}>PLAYERS</h3>

            {format === 'singles' ? (
              <div className="flex items-center gap-3 mb-2">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <PlayerAvatar name={user?.profile?.displayName || user?.email || ''} photo={user?.profile?.photoUrl} size={44} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{(user?.profile?.displayName || user?.email || '').split(' ')[0]}</span>
                  <span style={{ fontSize: 10, color: 'var(--accent)' }}>you</span>
                </div>
                <span style={{ color: 'var(--text3)', fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: 2 }}>VS</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                  {form.opponent1 && (
                    <>
                      <PlayerAvatar name={getPlayerName(form.opponent1)} photo={getPlayerPhoto(form.opponent1)} size={44} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{getPlayerName(form.opponent1).split(' ')[0]}</span>
                    </>
                  )}
                  <div className="form-group" style={{ margin: 0, width: '100%' }}>
                    <select value={form.opponent1} onChange={e => setField('opponent1', e.target.value)} required>
                      <option value="">Select opponent...</option>
                      {otherPlayers.map(p => (
                        <option key={p.userId} value={p.userId}>{p.displayName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Team 1 */}
                <div style={{ marginBottom: 16, padding: 12, background: 'var(--accent-dim)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: 1, marginBottom: 12, color: 'var(--accent)' }}>YOUR TEAM</div>
                  <div className="flex items-center gap-3 mb-3">
                    <PlayerAvatar name={user?.profile?.displayName || user?.email || ''} photo={user?.profile?.photoUrl} size={40} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.profile?.displayName || user?.email}</div>
                      <span style={{ fontSize: 10, color: 'var(--accent)' }}>you</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {form.partner && <PlayerAvatar name={getPlayerName(form.partner)} photo={getPlayerPhoto(form.partner)} size={40} />}
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      <select value={form.partner} onChange={e => setField('partner', e.target.value)} required>
                        <option value="">Select partner...</option>
                        {availableForPartner.map(p => (
                          <option key={p.userId} value={p.userId}>{p.displayName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', color: 'var(--text3)', fontFamily: 'var(--font-display)', letterSpacing: 2, margin: '8px 0' }}>VS</div>

                {/* Team 2 */}
                <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: 1, marginBottom: 12, color: 'var(--text2)' }}>OPPOSING TEAM</div>
                  <div className="flex items-center gap-3 mb-3">
                    {form.opponent1 && <PlayerAvatar name={getPlayerName(form.opponent1)} photo={getPlayerPhoto(form.opponent1)} size={40} />}
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      <select value={form.opponent1} onChange={e => setField('opponent1', e.target.value)} required>
                        <option value="">Select opponent 1...</option>
                        {availableForOpp1.map(p => (
                          <option key={p.userId} value={p.userId}>{p.displayName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {form.opponent2 && <PlayerAvatar name={getPlayerName(form.opponent2)} photo={getPlayerPhoto(form.opponent2)} size={40} />}
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      <select value={form.opponent2} onChange={e => setField('opponent2', e.target.value)} required>
                        <option value="">Select opponent 2...</option>
                        {availableForOpp2.map(p => (
                          <option key={p.userId} value={p.userId}>{p.displayName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Number of Sets selector */}
          <div className="card mb-4">
            <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 16 }}>SCORE</h3>
            <div className="form-group">
              <label>How many sets were played? *</label>
              <select
                value={form.numberOfSets}
                onChange={e => setField('numberOfSets', parseInt(e.target.value))}
                required
              >
                <option value={0}>Select number of sets...</option>
                <option value={1}>1 Set</option>
                <option value={2}>2 Sets</option>
                <option value={3}>3 Sets</option>
              </select>
            </div>

            {/* Score inputs appear after selecting number of sets */}
            {form.numberOfSets > 0 && (
              <>
                <table className="score-table" style={{ marginBottom: 16 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', paddingLeft: 12 }}>Player</th>
                      {Array.from({ length: form.numberOfSets }, (_, i) => <th key={i}>Set {i + 1}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ textAlign: 'left', paddingLeft: 12 }}>
                        {format === 'doubles'
                          ? `${user?.profile?.displayName || 'You'} / ${form.partner ? getPlayerName(form.partner) : '...'}`
                          : (user?.profile?.displayName || 'You')
                        }
                      </td>
                      {Array.from({ length: form.numberOfSets }, (_, i) => (
                        <td key={i}><input type="number" min={0} max={7} value={form.sets[i].myScore} onChange={e => setSetScore(i, 'myScore', e.target.value)} style={{ width: 50, textAlign: 'center', padding: '4px' }} /></td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ textAlign: 'left', paddingLeft: 12 }}>
                        {format === 'doubles'
                          ? `${form.opponent1 ? getPlayerName(form.opponent1) : 'Opp 1'} / ${form.opponent2 ? getPlayerName(form.opponent2) : 'Opp 2'}`
                          : (form.opponent1 ? getPlayerName(form.opponent1) : 'Opponent')
                        }
                      </td>
                      {Array.from({ length: form.numberOfSets }, (_, i) => (
                        <td key={i}><input type="number" min={0} max={7} value={form.sets[i].oppScore} onChange={e => setSetScore(i, 'oppScore', e.target.value)} style={{ width: 50, textAlign: 'center', padding: '4px' }} /></td>
                      ))}
                    </tr>
                  </tbody>
                </table>

                <div className="form-group">
                  <label>Winner *</label>
                  <div className="flex gap-3">
                    <button type="button" className={`btn ${winner === 'me' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setWinner('me')}>
                      {format === 'doubles' ? 'Our team won' : 'I won'}
                    </button>
                    <button type="button" className={`btn ${winner === 'opponent' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setWinner('opponent')}>
                      {format === 'doubles' ? 'They won' : 'Opponent won'}
                    </button>
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
              </>
            )}
          </div>

          {/* Notes */}
          <div className="card mb-4">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="notes">Match Notes</label>
              <textarea id="notes" value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Optional notes" maxLength={500} />
            </div>
          </div>

          {error && <div className="alert alert-danger mb-4">{error}</div>}

          <div className="alert alert-info mb-4">
            Match will be <strong>pending confirmation</strong> until your opponent confirms.
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Match Result'}
          </button>
        </form>
      )}
    </div>
  )
}
