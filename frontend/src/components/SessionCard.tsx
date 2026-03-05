import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { formatTime, isAfterDark, getInitials } from '../lib/utils'
import LocationBadge from './LocationBadge'
import SkillDisplay from './SkillDisplay'

interface Props { session: any; onClick?: () => void }

export default function SessionCard({ session, onClick }: Props) {
  const navigate = useNavigate()
  const afterDark = isAfterDark(session.startTime)
  const isUnlit = !session.location?.lighted
  const startDate = new Date(session.startTime)

  return (
    <div
      className="card clickable session-card-v2"
      onClick={onClick || (() => navigate(`/sessions/${session.id}`))}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/sessions/${session.id}`)}
    >
      <div className="sc-layout">
        {/* Left: Big date block */}
        <div className="sc-date-block">
          <span className="sc-date-weekday">{format(startDate, 'EEE')}</span>
          <span className="sc-date-day">{format(startDate, 'd')}</span>
          <span className="sc-date-month">{format(startDate, 'MMM')}</span>
        </div>

        {/* Right: Session details */}
        <div className="sc-details">
          {/* Court name + badges row */}
          <div className="sc-top-row">
            <div className="sc-court-name">
              {session.location?.name || 'TBD'}
            </div>
            <div className="sc-badges">
              <LocationBadge lighted={session.location?.lighted} compact />
              {afterDark && isUnlit && (
                <span className="text-xs text-orange">⚠️</span>
              )}
            </div>
          </div>

          {/* Time + format */}
          <div className="sc-time-row">
            <span>{formatTime(session.startTime)} – {formatTime(session.endTime)}</span>
            <span className={`badge ${session.format === 'singles' ? 'badge-blue' : 'badge-orange'}`} style={{ fontSize: 11 }}>
              {session.format}
            </span>
            <span className="badge badge-gray" style={{ fontSize: 11 }}>{session.stakes}</span>
            {session.status === 'cancelled' && <span className="badge badge-red" style={{ fontSize: 11 }}>cancelled</span>}
          </div>

          {/* Skill level */}
          <div className="sc-skill-row">
            <SkillDisplay level={(session.levelMin + session.levelMax) / 2} />
            <span className="text-xs text-muted">&nbsp;({session.levelMin}–{session.levelMax})</span>
          </div>

          {session.notes && (
            <p className="text-sm text-muted truncate" style={{ margin: '4px 0 0' }}>{session.notes}</p>
          )}

          {/* Player avatars */}
          <div className="sc-players">
            {session.participants?.slice(0, 6).map((p: any) => {
              const name = p.user?.profile?.displayName || 'Player'
              const photo = p.user?.profile?.photoUrl
              return (
                <div key={p.userId} className="sc-player">
                  <div className="sc-player-avatar">
                    {photo
                      ? <img src={photo} alt="" />
                      : getInitials(name)
                    }
                  </div>
                  <span className="sc-player-name">{name.split(' ')[0]}</span>
                </div>
              )
            })}
            {session.participants?.length > 6 && (
              <div className="sc-player">
                <div className="sc-player-avatar sc-player-more">+{session.participants.length - 6}</div>
              </div>
            )}
            {session._count?.messages > 0 && (
              <span className="sc-msg-count">{session._count.messages} msg</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
