import { useRef } from 'react'
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

const TOKEN_RE = /(\*\*[^\n*]+?\*\*)|(__[^\n_]+?__)|(\*[^\n*]+?\*)|(https?:\/\/[^\s]+)|(@[a-zA-Z0-9_-]{2,30})/g

function tokenize(line: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let lastIdx = 0
  let n = 0
  let m: RegExpExecArray | null
  const re = new RegExp(TOKEN_RE.source, 'g')
  while ((m = re.exec(line)) !== null) {
    if (m.index > lastIdx) {
      out.push(<span key={`${keyPrefix}-${n++}`}>{line.slice(lastIdx, m.index)}</span>)
    }
    const tok = m[0]
    const k = `${keyPrefix}-${n++}`
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
      out.push(<strong key={k}>{tokenize(tok.slice(2, -2), k + 'b')}</strong>)
    } else if (tok.startsWith('__') && tok.endsWith('__') && tok.length > 4) {
      out.push(<u key={k}>{tokenize(tok.slice(2, -2), k + 'u')}</u>)
    } else if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) {
      out.push(<em key={k}>{tokenize(tok.slice(1, -1), k + 'i')}</em>)
    } else if (tok.startsWith('http')) {
      out.push(
        <a key={k} href={tok} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', wordBreak: 'break-all' }}>
          {tok}
        </a>
      )
    } else if (tok.startsWith('@')) {
      const handle = tok.slice(1)
      out.push(
        <Link key={k} to={`/players?search=${encodeURIComponent(handle)}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
          {tok}
        </Link>
      )
    }
    lastIdx = m.index + tok.length
  }
  if (lastIdx < line.length) {
    out.push(<span key={`${keyPrefix}-${n++}`}>{line.slice(lastIdx)}</span>)
  }
  return out
}

export function renderRichText(body: string): React.ReactNode[] {
  if (!body) return []
  const lines = body.split('\n')
  const out: React.ReactNode[] = []
  lines.forEach((line, i) => {
    out.push(...tokenize(line, `l${i}`))
    if (i < lines.length - 1) out.push(<br key={`br-${i}`} />)
  })
  return out
}

interface RichTextareaProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  required?: boolean
  hint?: boolean
}

export function RichTextarea({ value, onChange, placeholder, rows, maxLength, required, hint = true }: RichTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  function wrap(marker: string) {
    const ta = ref.current
    if (!ta) return
    const start = ta.selectionStart ?? value.length
    const end = ta.selectionEnd ?? value.length
    const selected = value.slice(start, end)
    const inner = selected || 'text'
    const next = value.slice(0, start) + marker + inner + marker + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      const innerStart = start + marker.length
      ta.setSelectionRange(innerStart, innerStart + inner.length)
    })
  }

  const btnStyle: React.CSSProperties = {
    width: 30, height: 28, padding: 0,
    background: 'var(--bg3, #222)',
    border: '1px solid var(--border, #444)',
    color: 'var(--text, #fff)',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <button type="button" title="Bold (**text**)" style={{ ...btnStyle, fontWeight: 800 }} onClick={() => wrap('**')}>B</button>
        <button type="button" title="Italic (*text*)" style={{ ...btnStyle, fontStyle: 'italic' }} onClick={() => wrap('*')}>I</button>
        <button type="button" title="Underline (__text__)" style={{ ...btnStyle, textDecoration: 'underline' }} onClick={() => wrap('__')}>U</button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        required={required}
        style={{ width: '100%' }}
      />
      {hint && (
        <div className="form-hint" style={{ marginTop: 4 }}>
          Format with <strong>**bold**</strong>, <em>*italic*</em>, <u>__underline__</u> · links auto-link · mention with @name
        </div>
      )}
    </div>
  )
}
