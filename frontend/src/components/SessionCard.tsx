import { useNavigate } from 'react-router-dom'
import { formatDateTime, formatTime, isAfterDark } from '../lib/utils'
import LocationBadge from './LocationBadge'
import SkillDisplay from './SkillDisplay'

interface Props { session: any; onClick?: () => void }

export default function SessionCard({ session, onClick }: Props) {
  const navigate = useNavigate()
  const afterDark = isAfterDark(session.startTime)
  const isUnlit = !session.location?.lighted

  return (
    <div
      className="card clickable session-card"
      onClick={onClick || (() => navigate(`/sessions/${session.id}`))}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/sessions/${session.id}`)}
    >
      <div className="session-card-header">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`badge ${session.format === 'singles' ? 'badge-blue' : 'badge-orange'}`}>
              {session.format}
            </span>
            <span className="badge badge-gray">{session.stakes}</span>
            {session.status === 'cancelled' && <span className="badge badge-red">cancelled</span>}
          </div>
          <div className="font-bold" style={{ fontSize: 15 }}>
            📍 {session.location?.name}
          </div>
        </div>
        <div className="text-right">
          <LocationBadge lighted={session.location?.lighted} compact />
          {afterDark && isUnlit && (
            <div className="text-xs text-orange mt-2">⚠️ After dark</div>
          )}
        </div>
      </div>

      <div className="session-meta">
        <span className="session-meta-item">
          🕐 {formatDateTime(session.startTime)} – {formatTime(session.endTime)}
        </span>
        <span className="session-meta-item">
          <SkillDisplay level={(session.levelMin + session.levelMax) / 2} />
          &nbsp;({session.levelMin}–{session.levelMax})
        </span>
      </div>

      {session.notes && (
        <p className="text-sm text-muted truncate">{session.notes}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="participant-list">
          {session.participants?.slice(0, 4).map((p: any) => (
            <span key={p.userId} className="participant-chip">
              <span className="avatar" style={{ width: 20, height: 20, fontSize: 10, background: 'var(--accent-dim)' }}>
                {p.user?.profile?.displayName?.[0] || '?'}
              </span>
              {p.user?.profile?.displayName || 'Player'}
            </span>
          ))}
          {session.participants?.length > 4 && (
            <span className="text-xs text-muted">+{session.participants.length - 4} more</span>
          )}
        </div>
        <span className="text-xs text-muted">{session._count?.messages || 0} msg</span>
      </div>
    </div>
  )
}
