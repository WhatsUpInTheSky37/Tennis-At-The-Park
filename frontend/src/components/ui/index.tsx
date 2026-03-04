import React from 'react'

// ─── Button ───────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontWeight: 600,
    borderRadius: 'var(--radius)',
    transition: 'all var(--transition)',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    width: fullWidth ? '100%' : undefined,
    fontFamily: 'var(--font-body)',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
  }

  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: '13px' },
    md: { padding: '10px 20px', fontSize: '15px' },
    lg: { padding: '14px 28px', fontSize: '17px' },
  }

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--baseline)',
      color: '#0d1f15',
    },
    secondary: {
      background: 'var(--surface-3)',
      color: 'var(--text)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-dim)',
    },
    danger: {
      background: 'rgba(255,68,68,0.15)',
      color: 'var(--error)',
      border: '1px solid rgba(255,68,68,0.3)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--baseline)',
      border: '1px solid var(--baseline)',
    },
  }

  return (
    <button
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size={14} /> : null}
      {children}
    </button>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────
export function Spinner({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

// ─── Card ─────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  onClick?: () => void
  hoverable?: boolean
}

export function Card({ children, style, onClick, hoverable }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--court-line)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        cursor: hoverable ? 'pointer' : undefined,
        transition: hoverable ? 'all var(--transition)' : undefined,
        ...style,
      }}
      onMouseEnter={
        hoverable
          ? (e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--baseline)'
              ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
            }
          : undefined
      }
      onMouseLeave={
        hoverable
          ? (e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--court-line)'
              ;(e.currentTarget as HTMLElement).style.transform = 'none'
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, id, style, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        style={{
          background: 'var(--surface-2)',
          border: `1px solid ${error ? 'var(--error)' : 'var(--court-line)'}`,
          borderRadius: 'var(--radius)',
          padding: '10px 14px',
          color: 'var(--text)',
          fontSize: '15px',
          outline: 'none',
          transition: 'border-color var(--transition)',
          width: '100%',
          ...style,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = error ? 'var(--error)' : 'var(--baseline)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? 'var(--error)' : 'var(--court-line)'
        }}
        {...props}
      />
      {error && <span style={{ fontSize: '12px', color: 'var(--error)' }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{hint}</span>}
    </div>
  )
}

// ─── Textarea ─────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, id, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        style={{
          background: 'var(--surface-2)',
          border: `1px solid ${error ? 'var(--error)' : 'var(--court-line)'}`,
          borderRadius: 'var(--radius)',
          padding: '10px 14px',
          color: 'var(--text)',
          fontSize: '15px',
          outline: 'none',
          resize: 'vertical',
          minHeight: '100px',
          width: '100%',
          fontFamily: 'var(--font-body)',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--baseline)' }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--court-line)' }}
        {...props}
      />
      {error && <span style={{ fontSize: '12px', color: 'var(--error)' }}>{error}</span>}
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, id, ...props }: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <select
        id={inputId}
        style={{
          background: 'var(--surface-2)',
          border: `1px solid ${error ? 'var(--error)' : 'var(--court-line)'}`,
          borderRadius: 'var(--radius)',
          padding: '10px 14px',
          color: 'var(--text)',
          fontSize: '15px',
          outline: 'none',
          width: '100%',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '36px',
          cursor: 'pointer',
        }}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <span style={{ fontSize: '12px', color: 'var(--error)' }}>{error}</span>}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'success' | 'error' | 'warn' | 'info' | 'baseline'

export function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: BadgeVariant }) {
  const colors: Record<BadgeVariant, React.CSSProperties> = {
    default: { background: 'var(--surface-3)', color: 'var(--text-dim)' },
    success: { background: 'rgba(68,221,136,0.15)', color: 'var(--success)' },
    error: { background: 'rgba(255,68,68,0.15)', color: 'var(--error)' },
    warn: { background: 'rgba(255,154,0,0.15)', color: 'var(--warn)' },
    info: { background: 'rgba(68,170,255,0.15)', color: 'var(--info)' },
    baseline: { background: 'var(--baseline-dim)', color: 'var(--baseline)' },
  }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '100px',
      fontSize: '12px',
      fontWeight: 600,
      letterSpacing: '0.04em',
      ...colors[variant],
    }}>
      {children}
    </span>
  )
}

// ─── Alert ────────────────────────────────────────────────────────
type AlertVariant = 'info' | 'warn' | 'error' | 'success'

export function Alert({ children, variant = 'info', onDismiss }: {
  children: React.ReactNode
  variant?: AlertVariant
  onDismiss?: () => void
}) {
  const colors: Record<AlertVariant, React.CSSProperties> = {
    info: { background: 'rgba(68,170,255,0.12)', border: '1px solid rgba(68,170,255,0.3)', color: 'var(--info)' },
    warn: { background: 'rgba(255,154,0,0.12)', border: '1px solid rgba(255,154,0,0.3)', color: 'var(--warn)' },
    error: { background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.3)', color: 'var(--error)' },
    success: { background: 'rgba(68,221,136,0.12)', border: '1px solid rgba(68,221,136,0.3)', color: 'var(--success)' },
  }
  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: 'var(--radius)',
      fontSize: '14px',
      display: 'flex',
      gap: '8px',
      alignItems: 'flex-start',
      ...colors[variant],
    }}>
      <span style={{ flex: 1 }}>{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} style={{ background: 'none', color: 'currentColor', fontSize: '16px', lineHeight: 1, flexShrink: 0, padding: '0 2px' }}>×</button>
      )}
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────
export function Divider({ style }: { style?: React.CSSProperties }) {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--court-line)', ...style }} />
}

// ─── Avatar ───────────────────────────────────────────────────────
export function Avatar({ name, photoUrl, size = 36 }: { name?: string; photoUrl?: string; size?: number }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  const colors = ['#e8f514', '#44dd88', '#44aaff', '#ff9a00', '#ff6688']
  const color = colors[initials.charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: `${color}22`,
      border: `2px solid ${color}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.38,
      fontWeight: 700,
      color,
      flexShrink: 0,
      fontFamily: 'var(--font-body)',
    }}>
      {initials}
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, action }: {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      {icon && <div style={{ opacity: 0.4, fontSize: '40px' }}>{icon}</div>}
      <div style={{ fontWeight: 600, fontSize: '18px', color: 'var(--text-dim)' }}>{title}</div>
      {subtitle && <div style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '300px' }}>{subtitle}</div>}
      {action}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--court-line)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          padding: '24px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90dvh',
          overflowY: 'auto',
          animation: 'slideUp 0.25s ease',
        }}
      >
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', letterSpacing: '0.02em' }}>{title}</h2>
            <button onClick={onClose} style={{ background: 'none', color: 'var(--text-dim)', fontSize: '24px', lineHeight: 1, padding: '4px 8px' }} aria-label="Close">×</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => e.key === ' ' && onChange(!checked)}
        style={{
          width: '44px', height: '24px',
          borderRadius: '12px',
          background: checked ? 'var(--baseline)' : 'var(--surface-3)',
          transition: 'background var(--transition)',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute',
          top: '3px',
          left: checked ? '23px' : '3px',
          width: '18px', height: '18px',
          borderRadius: '50%',
          background: checked ? '#0d1f15' : 'var(--text-dim)',
          transition: 'left var(--transition)',
        }} />
      </div>
      {label && <span style={{ fontSize: '15px' }}>{label}</span>}
    </label>
  )
}
