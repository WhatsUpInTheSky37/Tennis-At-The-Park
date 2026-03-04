
export function Avatar({ name, url, size = 'md' }: { name?: string; url?: string; size?: 'sm'|'md'|'lg'|'xl' }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  if (url) return <img className={`avatar avatar-${size}`} src={url} alt={name} />;
  return <div className={`avatar avatar-${size}`}>{initials}</div>;
}

export function Spinner() {
  return <div className="flex justify-center items-center" style={{ padding: 40 }}><div className="spinner" /></div>;
}

export function EmptyState({ emoji, title, subtitle, action }: {
  emoji?: string; title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      {emoji && <div className="emoji">{emoji}</div>}
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkillBadge({ level }: { level: number }) {
  const label = level < 2.5 ? 'Beginner' : level < 3.5 ? 'Intermediate' : level < 4.5 ? 'Advanced' : 'Expert';
  const cls = level < 2.5 ? 'badge-gray' : level < 3.5 ? 'badge-blue' : level < 4.5 ? 'badge-yellow' : 'badge-red';
  return <span className={`badge ${cls}`}>{level.toFixed(1)} {label}</span>;
}

export function CourtInfo({ lighted, courtNum }: { lighted: boolean; courtNum?: number | null }) {
  return (
    <span className={`court-badge ${lighted ? 'court-lighted' : 'court-unlighted'}`}>
      {lighted ? '💡' : '🌑'} {lighted ? 'Lighted' : 'Not Lighted'}
      {courtNum && ` · Court ${courtNum}`}
    </span>
  );
}

export function EloDisplay({ elo }: { elo: number }) {
  return <span className="elo-badge">{Math.round(elo)} ELO</span>;
}

export function Disclaimer() {
  return (
    <div className="court-disclaimer">
      <strong>ℹ️ Public courts follow posted rules and are first-come/rotation-based.</strong>{' '}
      This app coordinates meetups; it does not reserve courts.{' '}
      <em>Arrive &amp; Rotate Tip:</em> If courts are full, follow posted rotation rules.
    </div>
  );
}

export function FormatBadge({ format }: { format: string }) {
  const map: Record<string, string> = { singles: '🎾 Singles', doubles: '🤝 Doubles', mixed: '🎾 Mixed', practice: '🏋️ Practice' };
  return <span className="badge badge-green">{map[format] || format}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: 'badge-green', cancelled: 'badge-red', full: 'badge-yellow',
    confirmed: 'badge-green', disputed: 'badge-red', pending_confirmation: 'badge-yellow', normal: 'badge-green',
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status.replace('_', ' ')}</span>;
}

export function ErrorMsg({ error }: { error?: string | null }) {
  if (!error) return null;
  return <div className="alert alert-error">{error}</div>;
}

import React from 'react';
export function Modal({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
