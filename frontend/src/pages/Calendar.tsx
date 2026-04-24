import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { formatTime, formatDateTime } from '../lib/utils'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay,
  addMonths, subMonths, isToday, parseISO
} from 'date-fns'

interface CalendarEvent {
  id: string
  type: 'challenge' | 'session'
  title: string
  startTime: string
  endTime: string
  location: string
  status: string
  format: string
  color: string
  raw: any
}

export default function Calendar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [view, setView] = useState<'month' | 'list'>('month')

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  // Fetch events for the visible range
  useEffect(() => {
    if (!user) return
    setLoading(true)
    const from = startOfWeek(startOfMonth(currentMonth)).toISOString()
    const to = endOfWeek(endOfMonth(currentMonth)).toISOString()

    Promise.all([
      api.getCalendarEvents({ from, to }).catch(() => ({ challenges: [], sessions: [] })),
      api.getSessions({ date: '' }).catch(() => [])
    ]).then(([calData, allSessions]) => {
      const mapped: CalendarEvent[] = []

      // Map challenges
      if (calData.challenges) {
        for (const c of calData.challenges) {
          const isReceived = c.challengedId === user.id
          const opponent = isReceived ? c.challenger : c.challenged
          const opponentName = opponent?.profile?.displayName || 'Unknown'
          mapped.push({
            id: c.id,
            type: 'challenge',
            title: isReceived ? `vs ${opponentName}` : `Challenge to ${opponentName}`,
            startTime: c.proposedTime,
            endTime: c.proposedEndTime,
            location: c.location?.name || '',
            status: c.status,
            format: c.format,
            color: c.status === 'accepted' ? 'var(--green)' : 'var(--orange)',
            raw: c
          })
        }
      }

      // Map sessions
      const sessionsToMap = calData.sessions || allSessions || []
      for (const s of sessionsToMap) {
        mapped.push({
          id: s.id,
          type: 'session',
          title: `${s.format} @ ${s.location?.name || 'TBD'}`,
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location?.name || '',
          status: s.status,
          format: s.format,
          color: 'var(--blue)',
          raw: s
        })
      }

      setEvents(mapped)
      setLoading(false)
    })
  }, [currentMonth, user])

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(e => {
      const eventDate = parseISO(e.startTime)
      return isSameDay(eventDate, day)
    })
  }

  // Selected day events
  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

  // All events sorted for list view
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }, [events])

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'challenge') {
      navigate('/challenges')
    } else {
      navigate(`/sessions/${event.id}`)
    }
  }

  if (!user) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">CALENDAR</h1>
          <p className="page-subtitle">Your matches, challenges & sessions</p>
        </div>
        <div className="empty-state">
          <div className="icon" style={{ fontSize: 48 }}>&#128197;</div>
          <h3>Sign in to view your calendar</h3>
          <p>Your challenges, sessions, and matches will appear here once you log in.</p>
          <div className="flex gap-2 justify-center mt-4">
            <button className="btn btn-primary" onClick={() => navigate('/auth')}>Sign In</button>
            <button className="btn btn-secondary" onClick={() => navigate('/activity')}>Browse Sessions</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">CALENDAR</h1>
          <p className="page-subtitle">
            Your matches, challenges & sessions
            {events.length > 0 && ` \u00B7 ${events.length} event${events.length !== 1 ? 's' : ''} this month`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={`btn btn-sm ${view === 'month' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('month')}
          >
            Month
          </button>
          <button
            className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('list')}
          >
            List
          </button>
        </div>
      </div>

      {/* Month Navigator */}
      <div className="card mb-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
          &#8592; Prev
        </button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 1, margin: 0 }}>
            {format(currentMonth, 'MMMM yyyy').toUpperCase()}
          </h2>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()) }}
            style={{ fontSize: 11, padding: '2px 8px' }}
          >
            Today
          </button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
          Next &#8594;
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-4" style={{ fontSize: 12 }}>
        <span className="flex items-center gap-1">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--blue)', display: 'inline-block' }} />
          Session
        </span>
        <span className="flex items-center gap-1">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
          Accepted Challenge
        </span>
        <span className="flex items-center gap-1">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--orange)', display: 'inline-block' }} />
          Pending Challenge
        </span>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : view === 'month' ? (
        <>
          {/* Calendar Grid */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Day headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
              background: 'var(--bg3)', borderBottom: '1px solid var(--border)'
            }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} style={{
                  padding: '8px 4px', textAlign: 'center',
                  fontSize: 11, fontWeight: 700, letterSpacing: 1,
                  color: 'var(--text2)', textTransform: 'uppercase'
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {calendarDays.map(day => {
                const dayEvents = getEventsForDay(day)
                const inMonth = isSameMonth(day, currentMonth)
                const today = isToday(day)
                const isSelected = selectedDay && isSameDay(day, selectedDay)

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    style={{
                      minHeight: 72,
                      padding: '4px 6px',
                      borderBottom: '1px solid var(--border)',
                      borderRight: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--maroon-dim)' : today ? 'rgba(75,158,255,0.06)' : 'transparent',
                      opacity: inMonth ? 1 : 0.35,
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{
                      fontSize: 13, fontWeight: today ? 800 : 500,
                      color: today ? '#fff' : 'var(--text1)',
                      marginBottom: 2,
                      width: 24, height: 24, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: today ? 'var(--maroon)' : 'transparent',
                    }}>
                      {format(day, 'd')}
                    </div>

                    {/* Event dots / mini labels */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {dayEvents.slice(0, 3).map(ev => (
                        <div
                          key={ev.id}
                          style={{
                            fontSize: 9,
                            padding: '1px 4px',
                            borderRadius: 3,
                            background: ev.color,
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: '14px'
                          }}
                        >
                          {ev.type === 'challenge' ? '\u2694' : '\ud83c\udfbe'} {formatTime(ev.startTime)}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div style={{ fontSize: 9, color: 'var(--text2)' }}>+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div className="card mt-4">
              <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 12 }}>
                {format(selectedDay, 'EEEE, MMMM d').toUpperCase()}
              </h3>

              {selectedDayEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p className="text-muted">Nothing scheduled for this day</p>
                  <div className="flex gap-2 justify-center mt-3">
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/sessions/new')}>Plan Session</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/players')}>Find Players</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedDayEvents.map(ev => (
                    <div
                      key={ev.id}
                      className="clickable"
                      onClick={() => handleEventClick(ev)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        borderLeft: `4px solid ${ev.color}`,
                        background: 'var(--bg3)',
                        cursor: 'pointer'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2 items-center">
                          <span className="font-bold text-sm">{ev.title}</span>
                          <span className={`badge ${ev.format === 'singles' ? 'badge-blue' : 'badge-orange'}`} style={{ fontSize: 10 }}>
                            {ev.format}
                          </span>
                        </div>
                        <span className={`badge ${ev.status === 'accepted' ? 'badge-green' : ev.status === 'pending' ? 'badge-orange' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                          {ev.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted mt-1">
                        {formatTime(ev.startTime)} - {formatTime(ev.endTime)} &#183; {ev.location}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* List View */
        <div>
          {sortedEvents.length === 0 ? (
            <div className="empty-state">
              <div className="icon" style={{ fontSize: 48 }}>&#128197;</div>
              <h3>No upcoming events</h3>
              <p>Plan a session or challenge a player!</p>
              <div className="flex gap-2 justify-center mt-3">
                <button className="btn btn-primary" onClick={() => navigate('/sessions/new')}>Plan Session</button>
                <button className="btn btn-secondary" onClick={() => navigate('/players')}>Find Players</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sortedEvents.map(ev => (
                <div
                  key={ev.id}
                  className="card clickable"
                  onClick={() => handleEventClick(ev)}
                  style={{ borderLeft: `4px solid ${ev.color}` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-2 items-center">
                      <span style={{ fontSize: 16 }}>{ev.type === 'challenge' ? '\u2694\uFE0F' : '\ud83c\udfbe'}</span>
                      <span className="font-bold">{ev.title}</span>
                    </div>
                    <span className={`badge ${ev.status === 'accepted' ? 'badge-green' : ev.status === 'pending' ? 'badge-orange' : 'badge-gray'}`}>
                      {ev.status}
                    </span>
                  </div>
                  <div className="session-meta">
                    <span>&#128197; {formatDateTime(ev.startTime)}</span>
                    <span>&#128336; {formatTime(ev.startTime)} - {formatTime(ev.endTime)}</span>
                    <span>&#128205; {ev.location}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
