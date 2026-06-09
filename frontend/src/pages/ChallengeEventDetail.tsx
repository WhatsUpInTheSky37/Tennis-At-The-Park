import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { formatDateTime, formatTime } from '../lib/utils'

const SCORING_LABELS: Record<string, string> = {
  first_to_4: 'First to 4 games',
  pro_set_8: '8-game pro set',
  tb_7: '7-point tiebreak',
  tb_10: '10-point tiebreak'
}

// ISO timestamp -> value for <input type="datetime-local"> (local time).
function localInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Podium medal styling per finishing rank (1=gold, 2=silver, 3=bronze).
const MEDALS: Record<number, { icon: string; color: string; tier: string }> = {
  1: { icon: '🥇', color: '#f5c542', tier: 'Gold — Champion' },
  2: { icon: '🥈', color: '#c0c6cc', tier: 'Silver — Runner-up' },
  3: { icon: '🥉', color: '#cd7f32', tier: 'Bronze — 3rd place' },
}

// Seed the edit form from an event record.
function buildEditForm(event: any) {
  return {
    name: event.name,
    locationId: event.locationId || event.location?.id || '',
    date: localInput(event.date),
    endTime: localInput(event.endTime),
    format: event.format,
    mode: event.mode,
    rotation: event.rotation,
    courts: event.courts,
    scoring: event.scoring,
    pointsPerWin: event.pointsPerWin,
    affectsElo: event.affectsElo,
    maxHillWins: event.maxHillWins ?? 3
  }
}

type Game = {
  court: number
  teamA: string[]
  teamB: string[]
  matchId?: string
  scoreA?: number
  scoreB?: number
  scored?: boolean
  holdStreak?: number
}

export default function ChallengeEventDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const autoEditDone = useRef(false)
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [players, setPlayers] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [addId, setAddId] = useState('')
  const [pairA, setPairA] = useState('')
  const [pairB, setPairB] = useState('')
  const [scores, setScores] = useState<Record<number, { a: string; b: string }>>({})
  const [editing, setEditing] = useState(false)
  const [edit, setEdit] = useState<any>(null)

  const load = () => {
    if (!id) return
    api.getChallengeEvent(id)
      .then(e => { setEvent(e); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { load() }, [id])
  useEffect(() => { api.getPlayers().then(setPlayers).catch(() => {}) }, [])
  useEffect(() => { api.getLocations().then(setLocations).catch(() => {}) }, [])

  // Open the edit panel automatically when linked with ?edit=1 (e.g. from the
  // events list), then strip the param so a refresh/back doesn't reopen it.
  useEffect(() => {
    if (autoEditDone.current || searchParams.get('edit') !== '1') return
    if (!event || !user) return
    const organizer = event.createdBy === user.id || user.isAdmin
    if (organizer && event.status !== 'completed') {
      autoEditDone.current = true
      setEdit(buildEditForm(event))
      setEditing(true)
    }
    searchParams.delete('edit')
    setSearchParams(searchParams, { replace: true })
  }, [event, user, searchParams])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!event) return <div className="page"><div className="empty-state"><h3>Event not found</h3></div></div>

  const isOrganizer = !!user && (event.createdBy === user.id || user.isAdmin)
  const names: Record<string, string> = event.playerNames || {}
  const nameFor = (uid: string) => names[uid] || 'Player'
  const teamLabel = (ids: string[]) => ids.map(nameFor).join(' & ')
  const standings: any[] = event.standings || []
  const round = event.round as { round: number; games: Game[]; byes: string[] } | null
  const inEvent = standings.some(s => s.userId === user?.id && s.status !== 'withdrawn')
  const participantIds = new Set(standings.filter(s => s.status !== 'withdrawn').map(s => s.userId))
  const addable = players.filter(p => !participantIds.has(p.userId))

  const act = async (fn: () => Promise<any>) => {
    setBusy(true); setError('')
    try { await fn(); load() }
    catch (e: any) { setError(e.message || 'Something went wrong') }
    finally { setBusy(false) }
  }

  const submitScore = async (court: number) => {
    const s = scores[court]
    if (!s || s.a === '' || s.b === '') { setError('Enter both scores'); return }
    const a = parseInt(s.a), b = parseInt(s.b)
    if (isNaN(a) || isNaN(b)) { setError('Scores must be numbers'); return }
    if (a === b) { setError('A game cannot end in a tie'); return }
    await act(async () => {
      await api.scoreChallengeGame(id!, court, a, b)
      setScores(prev => { const n = { ...prev }; delete n[court]; return n })
    })
  }

  const openEdit = () => {
    setEdit(buildEditForm(event))
    setError('')
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!edit.name?.trim()) { setError('Name is required'); return }
    if (!edit.locationId) { setError('Pick a location'); return }
    if (!edit.date) { setError('Pick a date & time'); return }
    const payload: any = {
      name: edit.name.trim(),
      locationId: edit.locationId,
      date: new Date(edit.date).toISOString(),
      endTime: edit.endTime ? new Date(edit.endTime).toISOString() : null,
      courts: Number(edit.courts),
      scoring: edit.scoring,
      pointsPerWin: Number(edit.pointsPerWin),
      affectsElo: edit.affectsElo,
      format: edit.format,
      mode: edit.mode,
      rotation: edit.rotation,
      maxHillWins: edit.mode === 'king_of_hill' ? Number(edit.maxHillWins) : null
    }
    await act(async () => { await api.updateChallengeEvent(id!, payload); setEditing(false) })
  }

  const openGames = round?.games.filter(g => !g.scored) || []
  const allScored = round != null && openGames.length === 0
  const statusBadge: Record<string, string> = { setup: 'badge-orange', active: 'badge-green', completed: 'badge-gray' }

  // Locked doubles teams (each pair listed once); free agents get shuffled each round.
  const showPairing = isOrganizer && event.format === 'doubles' && event.status !== 'completed'
  const lockedPairs: [any, any][] = []
  const pairSeen = new Set<string>()
  for (const s of standings) {
    if (s.partnerId && !pairSeen.has(s.userId)) {
      const partner = standings.find(x => x.userId === s.partnerId)
      if (partner) { lockedPairs.push([s, partner]); pairSeen.add(s.userId); pairSeen.add(s.partnerId) }
    }
  }
  const freeAgents = standings.filter(s => !s.partnerId && s.status !== 'withdrawn')

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/challenge-events')}>← All events</button>
          <a className="btn btn-ghost btn-sm" href={`/challenge-events/${id}/tv`} target="_blank" rel="noreferrer">📺 TV Mode</a>
        </div>
        <div className="flex items-center justify-between mt-2">
          <h1 className="page-title" style={{ marginBottom: 4 }}>{event.name}</h1>
          <span className={`badge ${statusBadge[event.status] || 'badge-gray'}`}>{event.status}</span>
        </div>
        <div className="session-meta">
          <span>📍 {event.location?.name}</span>
          <span>🕐 {formatDateTime(event.date)}{event.endTime ? ` – ${formatTime(event.endTime)}` : ''}</span>
          <span>🎾 {event.format} · {event.courts} court{event.courts > 1 ? 's' : ''}</span>
          <span>🏆 {event.mode === 'king_of_hill' ? `King of the Hill (max ${event.maxHillWins} wins)` : event.rotation}</span>
          {event.affectsElo && <span>📈 Counts toward Elo</span>}
        </div>
      </div>

      {error && <div className="card mb-3" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>{error}</div>}

      {/* EDIT settings (organizer / admin, before the event is completed) */}
      {isOrganizer && event.status !== 'completed' && !editing && (
        <div className="mb-4">
          <button className="btn btn-ghost btn-sm" onClick={openEdit}>✎ Edit settings</button>
        </div>
      )}

      {isOrganizer && event.status !== 'completed' && editing && edit && (
        <div className="card mb-4">
          <h3 className="mb-3">Edit event</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Name</label>
              <input value={edit.name} maxLength={120}
                onChange={e => setEdit({ ...edit, name: e.target.value })} />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Location</label>
              <select value={edit.locationId} onChange={e => setEdit({ ...edit, locationId: e.target.value })}>
                <option value="">Pick a location…</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 160 }}>
                <label>Start</label>
                <input type="datetime-local" value={edit.date}
                  onChange={e => setEdit({ ...edit, date: e.target.value })} />
              </div>
              <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 160 }}>
                <label>End (optional)</label>
                <input type="datetime-local" value={edit.endTime}
                  onChange={e => setEdit({ ...edit, endTime: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 110 }}>
                <label>Courts</label>
                <input type="number" min={1} max={16} value={edit.courts}
                  onChange={e => setEdit({ ...edit, courts: Number(e.target.value) })} />
              </div>
              <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 160 }}>
                <label>Scoring</label>
                <select value={edit.scoring} onChange={e => setEdit({ ...edit, scoring: e.target.value })}>
                  {Object.entries(SCORING_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 110 }}>
                <label>Points / win</label>
                <input type="number" min={1} max={10} value={edit.pointsPerWin}
                  onChange={e => setEdit({ ...edit, pointsPerWin: Number(e.target.value) })} />
              </div>
            </div>

            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 130 }}>
                <label>Format</label>
                <select value={edit.format} onChange={e => setEdit({ ...edit, format: e.target.value })}>
                  <option value="singles">Singles</option>
                  <option value="doubles">Doubles</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 130 }}>
                <label>Mode</label>
                <select value={edit.mode} onChange={e => setEdit({ ...edit, mode: e.target.value })}>
                  <option value="rotating">Rotating</option>
                  <option value="king_of_hill">King of the Hill</option>
                </select>
              </div>
              {edit.mode === 'king_of_hill' ? (
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 130 }}>
                  <label>Max hill wins</label>
                  <input type="number" min={1} max={20} value={edit.maxHillWins}
                    onChange={e => setEdit({ ...edit, maxHillWins: Number(e.target.value) })} />
                </div>
              ) : (
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 130 }}>
                  <label>Rotation</label>
                  <select value={edit.rotation} onChange={e => setEdit({ ...edit, rotation: e.target.value })}>
                    <option value="americano">Americano</option>
                    <option value="mexicano">Mexicano</option>
                  </select>
                </div>
              )}
            </div>

            {event.status === 'active' && (
              <p className="text-xs text-muted" style={{ margin: 0 }}>
                Structural changes (courts, format, mode, rotation) take effect from the <strong>next round</strong> — the current round keeps its games. To apply them now, finish or skip to the next round.
              </p>
            )}

            <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={edit.affectsElo} style={{ width: 'auto' }}
                onChange={e => setEdit({ ...edit, affectsElo: e.target.checked })} />
              <span>Counts toward Elo ratings</span>
            </label>

            <div className="flex gap-2">
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={saveEdit}>
                {busy ? 'Saving…' : 'Save changes'}
              </button>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setEditing(false); setError('') }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SELF join/leave */}
      {user && event.status !== 'completed' && (
        <div className="flex gap-2 mb-4">
          {inEvent
            ? <button className="btn btn-ghost btn-sm" onClick={() => act(() => api.leaveChallengeEvent(id!))} disabled={busy}>Leave event</button>
            : <button className="btn btn-primary btn-sm" onClick={() => act(() => api.joinChallengeEvent(id!))} disabled={busy}>Join event</button>}
        </div>
      )}

      {/* Roster management — during setup (everyone) and mid-event (organizer, for walk-ins / early leavers) */}
      {(event.status === 'setup' || (event.status === 'active' && isOrganizer)) && (
        <div className="card mb-4">
          <h3 className="mb-2">{event.status === 'active' ? 'Manage Players' : 'Roster'} ({standings.filter(s => s.status !== 'withdrawn').length})</h3>
          {standings.length === 0 && <p className="text-sm text-muted">No players yet.</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {standings.map(s => (
              <span key={s.userId} className={`badge ${s.status === 'withdrawn' ? 'badge-gray' : 'badge-blue'}`} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                {s.displayName}{s.status === 'withdrawn' ? ' (out)' : ''}
                {isOrganizer && s.status !== 'withdrawn' && (
                  <button onClick={() => act(() => api.removeChallengeEventPlayer(id!, s.userId))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>✕</button>
                )}
              </span>
            ))}
          </div>

          {isOrganizer && (
            <>
              <div className="flex gap-2 mt-3">
                <select value={addId} onChange={e => setAddId(e.target.value)} style={{ flex: 1 }}>
                  <option value="">Add a player...</option>
                  {addable.map(p => <option key={p.userId} value={p.userId}>{p.displayName}</option>)}
                </select>
                <button className="btn btn-secondary btn-sm" disabled={!addId || busy}
                  onClick={() => act(async () => { await api.addChallengeEventPlayer(id!, addId); setAddId('') })}>Add</button>
              </div>
              {event.status === 'setup' ? (
                <button className="btn btn-primary mt-3" disabled={busy}
                  onClick={() => act(() => api.startChallengeEvent(id!))}>
                  🎲 Randomize & Start Round 1
                </button>
              ) : (
                <p className="text-xs text-muted mt-2">
                  {event.mode === 'king_of_hill'
                    ? 'Walk-ins join the queue right away; removed players drop out after their current game.'
                    : 'Walk-ins join the next round; removed players drop out after the current round.'}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Locked doubles teams */}
      {showPairing && (
        <div className="card mb-4">
          <h3 className="mb-1">🔒 Locked Teams</h3>
          <p className="text-sm text-muted mb-3">
            Lock partners who always play together (e.g. you &amp; your spouse) — they stay a team all day. Everyone else is a free agent and gets mixed into teams.
          </p>

          {lockedPairs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {lockedPairs.map(([a, b]) => (
                <div key={a.userId} className="flex items-center justify-between" style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 12px' }}>
                  <span className="font-bold">🔒 {a.displayName} &amp; {b.displayName}</span>
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act(() => api.clearChallengePair(id!, a.userId))}>Unlock</button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <select value={pairA} onChange={e => setPairA(e.target.value)} style={{ flex: 1, minWidth: 130 }}>
              <option value="">Player…</option>
              {freeAgents.map(s => <option key={s.userId} value={s.userId}>{s.displayName}</option>)}
            </select>
            <select value={pairB} onChange={e => setPairB(e.target.value)} style={{ flex: 1, minWidth: 130 }}>
              <option value="">Partner…</option>
              {freeAgents.filter(s => s.userId !== pairA).map(s => <option key={s.userId} value={s.userId}>{s.displayName}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" disabled={!pairA || !pairB || busy}
              onClick={() => act(async () => { await api.setChallengePair(id!, pairA, pairB); setPairA(''); setPairB('') })}>
              Lock team
            </button>
          </div>
          {freeAgents.length > 0 && (
            <p className="text-xs text-muted mt-2">Free agents (shuffled): {freeAgents.map(s => s.displayName).join(', ')}</p>
          )}
        </div>
      )}

      {/* ACTIVE: current round */}
      {event.status === 'active' && round && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ margin: 0 }}>Round {round.round}</h3>
            {isOrganizer && event.mode !== 'king_of_hill' && (
              <button className="btn btn-primary btn-sm" disabled={busy}
                onClick={() => act(() => api.nextChallengeRound(id!, !allScored))}>
                {allScored ? 'Next Round →' : 'Skip to Next Round'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {round.games.map(g => {
              const canScore = !g.scored && (isOrganizer || [...g.teamA, ...g.teamB].includes(user?.id || ''))
              const sc = scores[g.court] || { a: '', b: '' }
              return (
                <div key={g.court} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, opacity: g.scored ? 0.6 : 1 }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="badge badge-gray">Court {g.court}</span>
                    {g.scored && <span className="text-xs text-muted">{g.scoreA}–{g.scoreB} ✓</span>}
                    {event.mode === 'king_of_hill' && (g.holdStreak ?? 0) > 0 && !g.scored &&
                      <span className="text-xs" style={{ color: 'var(--accent)' }}>🔥 {g.holdStreak} win streak</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2" style={{ flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 100, fontWeight: 600 }}>{teamLabel(g.teamA)}</div>
                    {canScore ? (
                      <input type="number" min={0} value={sc.a} placeholder="0" style={{ width: 56 }}
                        onChange={e => setScores({ ...scores, [g.court]: { ...sc, a: e.target.value } })} />
                    ) : <span style={{ fontFamily: 'var(--font-mono)' }}>{g.scoreA ?? '–'}</span>}
                    <span className="text-muted">vs</span>
                    {canScore ? (
                      <input type="number" min={0} value={sc.b} placeholder="0" style={{ width: 56 }}
                        onChange={e => setScores({ ...scores, [g.court]: { ...sc, b: e.target.value } })} />
                    ) : <span style={{ fontFamily: 'var(--font-mono)' }}>{g.scoreB ?? '–'}</span>}
                    <div style={{ flex: 1, minWidth: 100, fontWeight: 600, textAlign: 'right' }}>{teamLabel(g.teamB)}</div>
                  </div>
                  {canScore && (
                    <button className="btn btn-secondary btn-sm mt-2" disabled={busy} onClick={() => submitScore(g.court)}>
                      Submit Score
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {round.byes.length > 0 && (
            <p className="text-sm text-muted mt-3">
              {event.mode === 'king_of_hill' ? 'In queue: ' : 'Sitting out: '}
              {round.byes.map(nameFor).join(', ')}
            </p>
          )}

          {isOrganizer && (
            <button className="btn btn-ghost btn-sm mt-3" disabled={busy}
              onClick={() => { if (confirm('End the event and finalize standings?')) act(() => api.completeChallengeEvent(id!)) }}>
              Finish event
            </button>
          )}
        </div>
      )}

      {/* PODIUM — Gold / Silver / Bronze */}
      {event.status === 'completed' && (() => {
        const podium = [1, 2, 3]
          .map(rank => {
            const members = standings.filter(s => s.finalRank === rank)
            if (members.length === 0) return null
            const top = members[0]
            return {
              rank,
              name: members.map(m => m.displayName).join(' & '),
              points: top.points, wins: top.wins, losses: top.losses,
            }
          })
          .filter(Boolean) as { rank: number; name: string; points: number; wins: number; losses: number }[]
        if (podium.length === 0) return null
        return (
          <div className="card mb-4" style={{
            padding: 20,
            background: 'linear-gradient(135deg, #1b3a24, #141821)',
            border: '1px solid var(--accent)', boxShadow: '0 0 22px rgba(127,254,74,0.18)'
          }}>
            <div className="text-xs" style={{ letterSpacing: 2, color: 'var(--text2)', textAlign: 'center', marginBottom: 14 }}>
              🏆 FINAL PODIUM
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {podium.map(p => {
                const medal = MEDALS[p.rank]
                return (
                  <div key={p.rank} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${medal.color}40`,
                    borderRadius: 12, padding: '10px 14px'
                  }}>
                    <span style={{ fontSize: p.rank === 1 ? 34 : 26, lineHeight: 1 }}>{medal.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: p.rank === 1 ? 20 : 16, color: p.rank === 1 ? 'var(--accent)' : 'var(--text)' }}>
                        {p.name}
                      </div>
                      <div className="text-xs text-muted">{medal.tier} · {p.points} pts · {p.wins}–{p.losses}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* STANDINGS */}
      <div className="card">
        <h3 className="mb-2">{event.status === 'completed' ? '🏆 Final Standings' : 'Standings'}</h3>
        {standings.length === 0 ? (
          <p className="text-sm text-muted">No players yet.</p>
        ) : (
          <table style={{ width: '100%', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text2)' }}>
                <th style={{ padding: '4px 6px' }}>#</th>
                <th style={{ padding: '4px 6px' }}>Player</th>
                <th style={{ padding: '4px 6px', textAlign: 'center' }}>Pts</th>
                <th style={{ padding: '4px 6px', textAlign: 'center' }}>W–L</th>
                <th style={{ padding: '4px 6px', textAlign: 'center' }}>Games</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.userId} style={{ borderTop: '1px solid var(--border)', opacity: s.status === 'withdrawn' ? 0.5 : 1 }}>
                  <td style={{ padding: '6px' }}>{MEDALS[s.finalRank] ? MEDALS[s.finalRank].icon : i + 1}</td>
                  <td style={{ padding: '6px' }}>
                    <span className="clickable" style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${s.userId}`)}>{s.displayName}</span>
                    {s.partnerId && <span className="text-xs text-muted" title={`Locked team with ${nameFor(s.partnerId)}`}> 🔒 {nameFor(s.partnerId)}</span>}
                    {s.status === 'withdrawn' && <span className="text-xs text-muted"> (out)</span>}
                  </td>
                  <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700 }}>{s.points}</td>
                  <td style={{ padding: '6px', textAlign: 'center' }}>{s.wins}–{s.losses}</td>
                  <td style={{ padding: '6px', textAlign: 'center' }}>{s.gamesWon}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MATCH HISTORY — how it went down, round by round */}
      {(() => {
        const matches: any[] = event.matches || []
        if (matches.length === 0) return null
        const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a: any, b: any) => a - b)
        return (
          <div className="card mt-4">
            <h3 className="mb-2">📋 Match History</h3>
            {rounds.map(rn => (
              <div key={rn} style={{ marginBottom: 14 }}>
                <div className="text-xs text-muted" style={{ letterSpacing: 1, marginBottom: 6 }}>
                  {rn ? `ROUND ${rn}` : 'GAMES'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {matches.filter(m => m.round === rn).map(m => {
                    const t1 = m.teams?.team1 || [], t2 = m.teams?.team2 || []
                    const sc = (m.score && m.score[0]) || []
                    const t1Won = JSON.stringify(m.winners) === JSON.stringify(t1)
                    return (
                      <div key={m.id} className="flex items-center justify-between" style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}>
                        <span style={{ flex: 1, fontWeight: t1Won ? 700 : 400, color: t1Won ? 'var(--accent)' : 'var(--text)' }}>
                          {t1Won && '✓ '}{teamLabel(t1)}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '0 10px' }}>
                          {sc[0] ?? '–'}–{sc[1] ?? '–'}
                        </span>
                        <span style={{ flex: 1, textAlign: 'right', fontWeight: !t1Won ? 700 : 400, color: !t1Won ? 'var(--accent)' : 'var(--text)' }}>
                          {!t1Won && '✓ '}{teamLabel(t2)}
                          {m.court ? <span className="text-xs text-muted"> · Ct {m.court}</span> : null}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      })()}

      {isOrganizer && (
        <button className="btn btn-ghost btn-sm mt-4" disabled={busy}
          onClick={() => { if (confirm('Delete this event permanently? This removes the event, all of its games, and any champion trophies from profiles.')) act(async () => { await api.deleteChallengeEvent(id!); navigate('/challenge-events') }) }}>
          Delete event
        </button>
      )}
    </div>
  )
}
