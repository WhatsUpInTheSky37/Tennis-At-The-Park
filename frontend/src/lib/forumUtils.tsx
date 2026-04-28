import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import { getInitials } from './utils'

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

const TOKEN_RE = /(!\[[^\]\n]*?\]\([^)\s]+\))|(\*\*[^\n*]+?\*\*)|(__[^\n_]+?__)|(\*[^\n*]+?\*)|(https?:\/\/[^\s]+)|(@\[[^\]\n]{2,60}\])|(@[a-zA-Z0-9_-]{2,30})/g

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
    if (tok.startsWith('![')) {
      const imgMatch = tok.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/)
      if (imgMatch) {
        const [, alt, src] = imgMatch
        out.push(
          <img
            key={k}
            src={src}
            alt={alt}
            style={{ maxWidth: '100%', height: 'auto', borderRadius: 6, display: 'block', margin: '12px auto' }}
          />
        )
      } else {
        out.push(<span key={k}>{tok}</span>)
      }
    } else if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
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
    } else if (tok.startsWith('@[')) {
      const name = tok.slice(2, -1)
      out.push(
        <Link key={k} to={`/players?search=${encodeURIComponent(name)}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
          @{name}
        </Link>
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

function getMentionTrigger(value: string, cursor: number): { triggerStart: number; query: string } | null {
  const before = value.slice(0, cursor)
  const lastAt = before.lastIndexOf('@')
  if (lastAt === -1) return null
  if (lastAt > 0 && !/\s/.test(value[lastAt - 1])) return null
  const segment = before.slice(lastAt + 1)
  if (/[\s\n\]]/.test(segment)) return null
  if (segment.length > 30) return null
  return { triggerStart: lastAt, query: segment }
}

interface RichTextareaProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  required?: boolean
  hint?: boolean
  allowImageUpload?: boolean
}

export function RichTextarea({ value, onChange, placeholder, rows, maxLength, required, hint = true, allowImageUpload = false }: RichTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [triggerStart, setTriggerStart] = useState<number | null>(null)
  const [results, setResults] = useState<any[]>([])
  const [highlightIdx, setHighlightIdx] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

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

  function syncMentionState(nextValue: string, cursor: number) {
    const trig = getMentionTrigger(nextValue, cursor)
    if (!trig) {
      setMentionQuery(null); setTriggerStart(null); setResults([])
      return
    }
    setTriggerStart(trig.triggerStart)
    setMentionQuery(trig.query)
  }

  useEffect(() => {
    if (mentionQuery === null) return
    const handle = setTimeout(() => {
      const params: Record<string, string> = {}
      if (mentionQuery) params.search = mentionQuery
      api.getPlayers(params)
        .then(rows => {
          setResults((rows || []).slice(0, 8))
          setHighlightIdx(0)
        })
        .catch(() => setResults([]))
    }, 150)
    return () => clearTimeout(handle)
  }, [mentionQuery])

  function selectMention(p: any) {
    const ta = ref.current
    if (!ta || triggerStart === null) return
    const name = p.displayName as string
    const replacement = name.includes(' ') ? `@[${name}] ` : `@${name} `
    const cursor = ta.selectionStart ?? value.length
    const before = value.slice(0, triggerStart)
    const after = value.slice(cursor)
    const next = before + replacement + after
    onChange(next)
    setMentionQuery(null); setTriggerStart(null); setResults([])
    requestAnimationFrame(() => {
      ta.focus()
      const pos = (before + replacement).length
      ta.setSelectionRange(pos, pos)
    })
  }

  async function uploadAndInsertImage(file: File) {
    setUploading(true); setUploadError('')
    try {
      const { url } = await api.uploadArticleImage(file)
      const ta = ref.current
      const cursor = ta?.selectionStart ?? value.length
      const insert = `\n![${file.name.replace(/\.[^.]+$/, '')}](${url})\n`
      const next = value.slice(0, cursor) + insert + value.slice(cursor)
      onChange(next)
      requestAnimationFrame(() => {
        if (!ta) return
        ta.focus()
        const pos = cursor + insert.length
        ta.setSelectionRange(pos, pos)
      })
    } catch (e: any) {
      setUploadError(e.message || 'Upload failed')
      setTimeout(() => setUploadError(''), 4000)
    } finally {
      setUploading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery === null || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => (i + 1) % results.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(i => (i - 1 + results.length) % results.length) }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selectMention(results[highlightIdx]) }
    else if (e.key === 'Escape') { setMentionQuery(null); setTriggerStart(null); setResults([]) }
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
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, alignItems: 'center' }}>
        <button type="button" title="Bold (**text**)" style={{ ...btnStyle, fontWeight: 800 }} onClick={() => wrap('**')}>B</button>
        <button type="button" title="Italic (*text*)" style={{ ...btnStyle, fontStyle: 'italic' }} onClick={() => wrap('*')}>I</button>
        <button type="button" title="Underline (__text__)" style={{ ...btnStyle, textDecoration: 'underline' }} onClick={() => wrap('__')}>U</button>
        {allowImageUpload && (
          <>
            <button
              type="button"
              title="Insert image"
              style={{ ...btnStyle, width: 'auto', padding: '0 10px' }}
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? '⏳' : '🖼️ Image'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
              onChange={async e => {
                const f = e.target.files?.[0]
                if (f) await uploadAndInsertImage(f)
                if (e.target) e.target.value = ''
              }}
            />
          </>
        )}
        {uploadError && <span style={{ color: 'var(--red, #c00)', fontSize: 12, marginLeft: 6 }}>{uploadError}</span>}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={e => {
          onChange(e.target.value)
          syncMentionState(e.target.value, e.target.selectionStart)
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={e => syncMentionState((e.target as HTMLTextAreaElement).value, (e.target as HTMLTextAreaElement).selectionStart)}
        onClick={e => syncMentionState((e.target as HTMLTextAreaElement).value, (e.target as HTMLTextAreaElement).selectionStart)}
        onBlur={() => setTimeout(() => { setMentionQuery(null); setResults([]) }, 150)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        required={required}
        style={{ width: '100%' }}
      />
      {mentionQuery !== null && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 0, right: 0,
            top: '100%',
            background: 'var(--bg2, #1a1a1a)',
            border: '1px solid var(--border, #444)',
            borderRadius: 6,
            zIndex: 30,
            maxHeight: 240,
            overflowY: 'auto',
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          }}
        >
          {results.map((p: any, i: number) => (
            <div
              key={p.userId || p.user?.id || i}
              onMouseDown={e => { e.preventDefault(); selectMention(p) }}
              onMouseEnter={() => setHighlightIdx(i)}
              style={{
                padding: '8px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: i === highlightIdx ? 'var(--accent-dim)' : 'transparent',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%', overflow: 'hidden',
                background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--accent)', flexShrink: 0,
              }}>
                {p.photoUrl
                  ? <img src={p.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : getInitials(p.displayName || '?')
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.displayName}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {hint && (
        <div className="form-hint" style={{ marginTop: 4 }}>
          Format with <strong>**bold**</strong>, <em>*italic*</em>, <u>__underline__</u>{allowImageUpload ? ' · click 🖼️ to upload an image' : ''} · type @ to mention a player
        </div>
      )}
    </div>
  )
}
