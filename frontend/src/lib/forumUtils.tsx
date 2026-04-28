import { Link } from 'react-router-dom'

export const REACTION_EMOJIS = ['👍', '🔥', '😂', '🎾', '👏', '💯']

export type ReactionRow = { emoji: string; userId: string }

export function summarizeReactions(rows: ReactionRow[] | undefined, currentUserId?: string) {
  const counts = new Map<string, { count: number; mine: boolean }>()
  for (const r of rows || []) {
    const cur = counts.get(r.emoji) || { count: 0, mine: false }
    cur.count += 1
    if (r.userId === currentUserId) cur.mine = true
    counts.set(r.emoji, cur)
  }
  return REACTION_EMOJIS
    .map(e => ({ emoji: e, count: counts.get(e)?.count || 0, mine: counts.get(e)?.mine || false }))
    .filter(r => r.count > 0)
}

const URL_RE = /(https?:\/\/[^\s]+)/g
const MENTION_RE = /(@[a-zA-Z0-9_-]{2,30})/g

export function renderRichText(body: string): React.ReactNode[] {
  if (!body) return []
  const lines = body.split('\n')
  const out: React.ReactNode[] = []
  lines.forEach((line, lineIdx) => {
    const tokens = line.split(new RegExp(`${URL_RE.source}|${MENTION_RE.source}`, 'g')).filter(t => t !== undefined && t !== '')
    tokens.forEach((tok, tokIdx) => {
      const key = `${lineIdx}-${tokIdx}`
      if (!tok) return
      if (URL_RE.test(tok)) {
        URL_RE.lastIndex = 0
        out.push(
          <a key={key} href={tok} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', wordBreak: 'break-all' }}>
            {tok}
          </a>
        )
      } else if (tok.startsWith('@') && /^@[a-zA-Z0-9_-]{2,30}$/.test(tok)) {
        const handle = tok.slice(1)
        out.push(
          <Link key={key} to={`/players?search=${encodeURIComponent(handle)}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
            {tok}
          </Link>
        )
      } else {
        out.push(<span key={key}>{tok}</span>)
      }
    })
    if (lineIdx < lines.length - 1) out.push(<br key={`br-${lineIdx}`} />)
  })
  return out
}
