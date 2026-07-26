import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'

// Live poll: signed-in members vote (and can change their vote); everyone sees
// results. `readOnly` (e.g. the public landing) shows results with a sign-in nudge.
export default function PollWidget({ readOnly = false }: { readOnly?: boolean }) {
  const { user } = useAuth()
  const [poll, setPoll] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { api.getActivePoll().then(setPoll).catch(() => {}) }, [])

  if (!poll) return null

  const total: number = poll.total || 0
  const canVote = !readOnly && !!user

  const vote = async (i: number) => {
    if (!canVote || busy) return
    setBusy(true)
    try { setPoll(await api.votePoll(poll.id, i)) } catch { /* ignore */ } finally { setBusy(false) }
  }

  return (
    <div className="card mb-4" style={{ border: '1px solid var(--accent)', boxShadow: '0 0 18px rgba(127,254,74,0.12)' }}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ fontSize: 20 }}>🗳️</span>
        <h3 style={{ margin: 0, fontSize: 17 }}>{poll.question}</h3>
      </div>
      <div className="text-xs text-muted mb-3">
        {total} vote{total === 1 ? '' : 's'}
        {canVote && (poll.myVote != null ? ' · tap another option to change your vote' : ' · tap your pick')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {poll.options.map((opt: string, i: number) => {
          const count = poll.counts?.[i] || 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const mine = poll.myVote === i
          return (
            <button
              key={i}
              type="button"
              disabled={!canVote || busy}
              onClick={() => vote(i)}
              style={{
                position: 'relative', textAlign: 'left', width: '100%',
                background: 'var(--bg3)', border: `1px solid ${mine ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10, padding: '10px 14px', overflow: 'hidden',
                cursor: canVote ? 'pointer' : 'default', color: 'var(--text)'
              }}
            >
              <div style={{
                position: 'absolute', inset: 0, width: `${pct}%`,
                background: mine ? 'var(--accent-dim)' : 'rgba(255,255,255,0.05)', transition: 'width .3s'
              }} />
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: mine ? 800 : 600 }}>{mine ? '✓ ' : ''}{opt}</span>
                <span className="text-sm" style={{ color: 'var(--text2)', whiteSpace: 'nowrap' }}>{pct}% · {count}</span>
              </div>
            </button>
          )
        })}
      </div>

      {readOnly && (
        <p className="text-xs text-muted mt-3" style={{ margin: '12px 0 0' }}>
          <Link to="/auth" style={{ color: 'var(--accent)' }}>Sign in</Link> to cast your vote.
        </p>
      )}
      {!readOnly && !user && (
        <p className="text-xs text-muted mt-3" style={{ margin: '12px 0 0' }}>Sign in to vote.</p>
      )}
    </div>
  )
}
