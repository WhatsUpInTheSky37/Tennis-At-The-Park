import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import SessionCard from '../components/SessionCard'
import DisclaimerBox from '../components/DisclaimerBox'

export default function Sessions() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ format: '', locationId: '', date: '' })
  const [locations, setLocations] = useState<any[]>([])

  useEffect(() => {
    api.getLocations().then(setLocations)
  }, [])

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (filters.format) params.format = filters.format
    if (filters.locationId) params.locationId = filters.locationId
    if (filters.date) params.date = filters.date
    api.getSessions(params).then(s => { setSessions(s); setLoading(false) })
  }, [filters])

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">COMMUNITY SCHEDULE</h1>
          <p className="page-subtitle">Planned meetup sessions at public courts</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/sessions/new')}>+ Plan Session</button>
      </div>

      <DisclaimerBox showRotation />

      {/* Filters */}
      <div className="card mb-4" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
          <label htmlFor="filter-date">Date</label>
          <input id="filter-date" type="date" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
          <label htmlFor="filter-location">Location</label>
          <select id="filter-location" value={filters.locationId} onChange={e => setFilters(f => ({ ...f, locationId: e.target.value }))}>
            <option value="">All locations</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
          <label htmlFor="filter-format">Format</label>
          <select id="filter-format" value={filters.format} onChange={e => setFilters(f => ({ ...f, format: e.target.value }))}>
            <option value="">All formats</option>
            <option value="singles">Singles</option>
            <option value="doubles">Doubles</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        {(filters.format || filters.locationId || filters.date) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ format: '', locationId: '', date: '' })} style={{ alignSelf: 'flex-end', marginBottom: 4 }}>
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📅</div>
          <h3>No sessions found</h3>
          <p>Be the first to plan a session!</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/sessions/new')}>Plan a Session</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sessions.map(s => <SessionCard key={s.id} session={s} />)}
        </div>
      )}
    </div>
  )
}
