import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Session, Location } from '../types';
import { Spinner, EmptyState, CourtInfo, FormatBadge, Disclaimer, Avatar } from '../components/ui/helpers';
import { format } from 'date-fns';

export default function FindMatch() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'sessions' | 'players'>('sessions');
  
  const [filters, setFilters] = useState({
    locationId: '', format: '', minSkill: '', maxSkill: '', lookingNow: false,
  });

  useEffect(() => {
    api.get<Location[]>('/locations').then(setLocations);
    loadSessions();
    loadPlayers();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.locationId) params.set('locationId', filters.locationId);
      const data = await api.get<Session[]>(`/sessions?${params}`);
      setSessions(data);
    } finally { setLoading(false); }
  };

  const loadPlayers = async () => {
    const params = new URLSearchParams();
    if (filters.lookingNow) params.set('lookingToPlay', 'true');
    if (filters.format) params.set('format', filters.format);
    if (filters.minSkill) params.set('minSkill', filters.minSkill);
    if (filters.maxSkill) params.set('maxSkill', filters.maxSkill);
    const data = await api.get<any[]>(`/players?${params}`);
    setPlayers(data.filter(p => p.userId !== user?.id));
  };

  const applyFilters = () => { loadSessions(); loadPlayers(); };

  const openSessions = sessions.filter(s => s.status === 'open' && new Date(s.startTime) > new Date(Date.now() - 60 * 60 * 1000));
  const filteredByLoc = filters.locationId ? openSessions.filter(s => s.locationId === filters.locationId) : openSessions;
  const filteredByFormat = filters.format ? filteredByLoc.filter(s => s.format === filters.format) : filteredByLoc;
  const filtered = filteredByFormat.filter(s => {
    if (filters.minSkill && s.levelMax < parseFloat(filters.minSkill)) return false;
    if (filters.maxSkill && s.levelMin > parseFloat(filters.maxSkill)) return false;
    return true;
  });

  return (
    <div className="page">
      <div className="container">
        <div className="section-header">
          <h1 className="display" style={{ fontSize: '2rem' }}>FIND A MATCH</h1>
          <Link to="/plan" className="btn btn-primary btn-sm">+ Plan Session</Link>
        </div>

        {/* Filters */}
        <div className="card card-body mb-4">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Location</label>
              <select className="form-select" value={filters.locationId} onChange={e => setFilters(f => ({ ...f, locationId: e.target.value }))}>
                <option value="">All locations</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Format</label>
              <select className="form-select" value={filters.format} onChange={e => setFilters(f => ({ ...f, format: e.target.value }))}>
                <option value="">Any format</option>
                <option value="singles">Singles</option>
                <option value="doubles">Doubles</option>
                <option value="mixed">Mixed</option>
                <option value="practice">Practice</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Min NTRP</label>
              <select className="form-select" value={filters.minSkill} onChange={e => setFilters(f => ({ ...f, minSkill: e.target.value }))}>
                <option value="">Any</option>
                {[1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Max NTRP</label>
              <select className="form-select" value={filters.maxSkill} onChange={e => setFilters(f => ({ ...f, maxSkill: e.target.value }))}>
                <option value="">Any</option>
                {[2.0,2.5,3.0,3.5,4.0,4.5,5.0,5.5,6.0].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.88rem' }}>
              <input type="checkbox" checked={filters.lookingNow} onChange={e => setFilters(f => ({ ...f, lookingNow: e.target.checked }))} />
              Looking to play now
            </label>
            <button className="btn btn-primary btn-sm" onClick={applyFilters}>Apply Filters</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ locationId: '', format: '', minSkill: '', maxSkill: '', lookingNow: false })}>
              Clear
            </button>
          </div>
        </div>

        <Disclaimer />

        {/* Tabs */}
        <div className="tabs mt-4">
          <button className={`tab-btn ${tab === 'sessions' ? 'active' : ''}`} onClick={() => setTab('sessions')}>
            📅 Sessions ({filtered.length})
          </button>
          <button className={`tab-btn ${tab === 'players' ? 'active' : ''}`} onClick={() => setTab('players')}>
            👥 Players ({players.length})
          </button>
        </div>

        {/* Sessions list */}
        {tab === 'sessions' && (
          loading ? <Spinner /> : filtered.length === 0 ? (
            <EmptyState emoji="🎾" title="No open sessions" subtitle="Be the first to plan a meetup!"
              action={<Link to="/plan" className="btn btn-primary">Plan a Session</Link>} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(s => (
                <Link key={s.id} to={`/sessions/${s.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card session-card">
                    <div className="card-body">
                      <div className="flex items-center justify-between mb-2">
                        <span className="session-time">{format(new Date(s.startTime), 'EEE, MMM d')} · {format(new Date(s.startTime), 'h:mm a')} – {format(new Date(s.endTime), 'h:mm a')}</span>
                        <span className="text-sm text-muted">{s.participants.length} joined</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <strong>{s.location.name}</strong>
                        <CourtInfo lighted={s.location.lighted} courtNum={s.courtNumber} />
                      </div>
                      <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
                        <FormatBadge format={s.format} />
                        <span className="badge badge-gray">{s.stakes}</span>
                        <span className="text-xs text-muted">NTRP {s.levelMin}–{s.levelMax}</span>
                        <span className="text-xs text-muted">Host: {s.creator.profile?.displayName}</span>
                      </div>
                      {s.notes && <p className="text-sm text-muted mt-2" style={{ fontStyle: 'italic' }}>{s.notes}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Players list */}
        {tab === 'players' && (
          players.length === 0 ? (
            <EmptyState emoji="👥" title="No players found" subtitle="Try adjusting your filters." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {players.map(p => (
                <Link key={p.userId} to={`/profile/${p.userId}`} style={{ textDecoration: 'none' }}>
                  <div className="card session-card">
                    <div className="card-body flex items-center gap-3">
                      <Avatar name={p.displayName} url={p.photoUrl} size="lg" />
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-2">
                          <strong>{p.displayName}</strong>
                          {p.lookingToPlay && <div className="looking-badge"><div className="dot" />Available</div>}
                        </div>
                        <div className="text-sm text-muted">
                          NTRP {p.skillLevel} · {p.handedness}-handed · {(p.preferredFormats || []).join(', ') || 'Any format'}
                        </div>
                        {p.bio && <p className="text-sm text-muted mt-1">{p.bio}</p>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="elo-badge">{Math.round(p.elo)} ELO</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
