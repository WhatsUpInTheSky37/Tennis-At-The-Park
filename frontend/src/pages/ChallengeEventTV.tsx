import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { formatTime } from '../lib/utils'

type Game = {
  court: number
  teamA: string[]
  teamB: string[]
  scoreA?: number
  scoreB?: number
  scored?: boolean
  holdStreak?: number
}

const REFRESH_MS = 5000
const MEDAL_ICON: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function ChallengeEventTV() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<any>(null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const timer = useRef<any>(null)

  const load = () => {
    if (!id) return
    api.getChallengeEvent(id)
      .then(e => { setEvent(e); setError('') })
      .catch(e => setError(e.message || 'Could not load event'))
  }

  useEffect(() => {
    load()
    timer.current = setInterval(() => { load(); setTick(t => t + 1) }, REFRESH_MS)
    return () => clearInterval(timer.current)
  }, [id])

  const names: Record<string, string> = event?.playerNames || {}
  const nameFor = (uid: string) => names[uid] || 'Player'
  const teamLabel = (ids: string[]) => ids.map(nameFor).join(' & ')
  const standings: any[] = event?.standings || []
  const round = event?.round as { round: number; games: Game[]; byes: string[] } | null
  // Point at the public TV view so players can follow live without logging in.
  const qrData = encodeURIComponent(`${window.location.origin}/challenge-events/${id}/tv`)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${qrData}`

  const C = {
    bg: '#0a1f14', panel: '#10301f', panel2: '#0d2719', line: '#1d5236',
    text: '#eafff2', dim: '#8fd6ad', accent: '#39d98a', gold: '#ffd86b'
  }

  if (error) {
    return (
      <div style={{ background: C.bg, color: C.text, minHeight: '100vh', display: 'grid', placeItems: 'center', fontSize: 28 }}>
        {error}
      </div>
    )
  }
  if (!event) {
    return (
      <div style={{ background: C.bg, color: C.text, minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }

  const isKoth = event.mode === 'king_of_hill'

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', padding: '2vw 2.5vw', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`@keyframes tvpulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderBottom: `2px solid ${C.line}`, paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: '2.6vw', fontWeight: 900, letterSpacing: 0.5, color: C.text }}>{event.name}</div>
          <div style={{ fontSize: '1.25vw', color: C.dim, marginTop: 6 }}>
            📍 {event.location?.name} · 🕐 {formatTime(event.date)}{event.endTime ? ` – ${formatTime(event.endTime)}` : ''} · {event.format} · {isKoth ? 'King of the Hill' : event.rotation}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.2vw', fontWeight: 900, color: C.accent }}>
            {event.status === 'active' ? `ROUND ${event.currentRound}` : event.status === 'completed' ? 'FINAL' : 'STARTING SOON'}
          </div>
          <div style={{ fontSize: '0.95vw', color: C.dim, marginTop: 4 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: C.accent, marginRight: 6, animation: 'tvpulse 2s infinite' }} />
            LIVE
          </div>
        </div>
      </div>

      {/* Main grid: courts on the left, standings + QR on the right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* Courts / current play */}
        <div>
          {event.status !== 'active' || !round ? (
            <div style={{ background: C.panel, borderRadius: 16, padding: 28, fontSize: '1.6vw', color: C.dim }}>
              {event.status === 'completed' ? '🏆 Event complete — final standings →' : 'Waiting for the organizer to start Round 1…'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: round.games.length > 2 ? '1fr 1fr' : '1fr', gap: 18 }}>
              {round.games.map(g => {
                const decided = !!g.scored
                return (
                  <div key={g.court} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{ fontSize: '1.3vw', fontWeight: 800, color: C.gold }}>COURT {g.court}</span>
                      {isKoth && (g.holdStreak ?? 0) > 0 && !decided && (
                        <span style={{ fontSize: '1vw', color: C.accent }}>🔥 {g.holdStreak} win streak</span>
                      )}
                      {decided && <span style={{ fontSize: '1vw', color: C.dim }}>FINAL</span>}
                    </div>
                    <Side name={teamLabel(g.teamA)} score={g.scoreA} won={decided && (g.scoreA ?? 0) > (g.scoreB ?? 0)} C={C} />
                    <div style={{ textAlign: 'center', color: C.dim, fontSize: '1vw', margin: '6px 0' }}>vs</div>
                    <Side name={teamLabel(g.teamB)} score={g.scoreB} won={decided && (g.scoreB ?? 0) > (g.scoreA ?? 0)} C={C} />
                  </div>
                )
              })}
            </div>
          )}

          {/* Queue / sitting out */}
          {round && round.byes.length > 0 && (
            <div style={{ background: C.panel2, borderRadius: 14, padding: 18, marginTop: 18 }}>
              <div style={{ fontSize: '1.1vw', fontWeight: 800, color: C.gold, marginBottom: 8 }}>
                {isKoth ? '⏳ UP NEXT (QUEUE)' : '🪑 SITTING THIS ROUND'}
              </div>
              <div style={{ fontSize: '1.3vw', color: C.text, lineHeight: 1.5 }}>
                {round.byes.map(nameFor).join('   ·   ')}
              </div>
            </div>
          )}
        </div>

        {/* Standings + QR */}
        <div>
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: 20, marginBottom: 18 }}>
            <div style={{ fontSize: '1.4vw', fontWeight: 900, color: C.gold, marginBottom: 12 }}>
              {event.status === 'completed' ? '🏆 FINAL STANDINGS' : '📊 STANDINGS'}
            </div>
            {standings.length === 0 ? (
              <div style={{ color: C.dim, fontSize: '1.2vw' }}>No players yet.</div>
            ) : (
              <div>
                {standings.slice(0, 12).map((s, i) => (
                  <div key={s.userId} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0', borderTop: i === 0 ? 'none' : `1px solid ${C.line}`,
                    opacity: s.status === 'withdrawn' ? 0.45 : 1
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <span style={{ fontSize: '1.2vw', fontWeight: 900, color: i < 3 ? C.gold : C.dim, width: '2vw' }}>
                        {event.status === 'completed' && MEDAL_ICON[s.finalRank] ? MEDAL_ICON[s.finalRank] : i + 1}
                      </span>
                      <span style={{ fontSize: '1.3vw', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.displayName}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: '1vw', color: C.dim }}>{s.wins}–{s.losses}</span>
                      <span style={{ fontSize: '1.5vw', fontWeight: 900, color: C.accent, minWidth: '2.5vw', textAlign: 'right' }}>{s.points}</span>
                    </div>
                  </div>
                ))}
                {standings.length > 12 && (
                  <div style={{ color: C.dim, fontSize: '0.95vw', marginTop: 8 }}>+ {standings.length - 12} more players</div>
                )}
              </div>
            )}
          </div>

          {/* QR to follow live / join on phone */}
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 18 }}>
            <img
              src={qrSrc}
              alt="Scan to follow live"
              width={120}
              height={120}
              style={{ background: '#fff', borderRadius: 12, padding: 6, flexShrink: 0 }}
              onError={e => { (e.currentTarget.style.display = 'none') }}
            />
            <div>
              <div style={{ fontSize: '1.3vw', fontWeight: 800, color: C.text }}>📱 Scan to follow live</div>
              <div style={{ fontSize: '1vw', color: C.dim, marginTop: 6 }}>
                Live matchups & standings on your phone — no login needed.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Side({ name, score, won, C }: { name: string; score?: number; won: boolean; C: any }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: won ? 'rgba(57,217,138,0.16)' : 'transparent',
      borderRadius: 10, padding: '8px 12px'
    }}>
      <span style={{ fontSize: '1.7vw', fontWeight: won ? 900 : 700, color: won ? C.accent : C.text }}>
        {won && '✓ '}{name}
      </span>
      <span style={{ fontSize: '2vw', fontWeight: 900, color: won ? C.accent : C.dim, fontVariantNumeric: 'tabular-nums' }}>
        {score ?? '–'}
      </span>
    </div>
  )
}
