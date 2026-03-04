import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Location } from '../types';
import { ErrorMsg, Disclaimer } from '../components/ui/helpers';
import { format } from 'date-fns';

export default function PlanSession() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [afterDarkWarning, setAfterDarkWarning] = useState(false);
  const [afterDarkConfirmed, setAfterDarkConfirmed] = useState(false);
  const [afterDarkTime] = useState('20:00');

  const now = new Date();
  const localISO = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [form, setForm] = useState({
    locationId: '',
    courtNumber: '',
    flexible: false,
    startTime: localISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0)),
    endTime: localISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 2, 0)),
    format: 'singles',
    stakes: 'casual',
    levelMin: user?.profile?.skillLevel ? Math.max(1, user.profile.skillLevel - 0.5) : 2.5,
    levelMax: user?.profile?.skillLevel ? Math.min(7, user.profile.skillLevel + 0.5) : 4.0,
    notes: '',
  });

  useEffect(() => {
    api.get<Location[]>('/locations').then(setLocations);
  }, []);

  const selectedLocation = locations.find(l => l.id === form.locationId);

  const isAfterDark = (timeStr: string) => {
    const [h, m] = afterDarkTime.split(':').map(Number);
    const [sh, sm] = timeStr.split('T')[1]?.split(':').map(Number) || [0, 0];
    return sh > h || (sh === h && sm >= m);
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // After-dark check for Winterplace
    if (selectedLocation && !selectedLocation.lighted) {
      if (isAfterDark(form.startTime) || isAfterDark(form.endTime)) {
        if (!afterDarkConfirmed) {
          setAfterDarkWarning(true);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const body: any = {
        locationId: form.locationId,
        courtNumber: form.flexible ? null : (form.courtNumber ? parseInt(form.courtNumber) : null),
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        format: form.format,
        stakes: form.stakes,
        levelMin: parseFloat(form.levelMin as any),
        levelMax: parseFloat(form.levelMax as any),
        notes: form.notes || undefined,
      };
      const session = await api.post<{ id: string }>('/sessions', body);
      navigate(`/sessions/${session.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const courtOptions = selectedLocation
    ? Array.from({ length: selectedLocation.courtCount }, (_, i) => i + 1)
    : [];

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 600 }}>
        <div className="section-header">
          <h1 className="display" style={{ fontSize: '2rem' }}>PLAN A SESSION</h1>
        </div>

        <Disclaimer />

        <div className="alert alert-info mt-3 mb-4">
          <div>
            <strong>🎾 Meetup Planning Only</strong><br />
            <span className="text-sm">This creates a community meetup plan. Courts are public — arrive early and follow posted rotation rules.</span>
          </div>
        </div>

        {afterDarkWarning && (
          <div className="alert alert-warning mb-4">
            <div>
              <strong>⚠️ After-Dark Warning</strong><br />
              <span className="text-sm">Winterplace Park is <strong>not lighted</strong>. Playing after {afterDarkTime} is strongly discouraged for safety reasons.</span>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-danger" onClick={() => { setAfterDarkConfirmed(true); setAfterDarkWarning(false); }}>
                  I understand, proceed anyway
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => setAfterDarkWarning(false)}>
                  Go back
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card card-body mt-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ErrorMsg error={error} />

          <div className="form-group">
            <label className="form-label">Location *</label>
            <select className="form-select" value={form.locationId} onChange={e => { set('locationId', e.target.value); set('courtNumber', ''); }} required>
              <option value="">Select location…</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.lighted ? '💡' : '🌑'} ({l.courtCount} courts)
                </option>
              ))}
            </select>
            {selectedLocation && (
              <span className={`court-badge mt-2 ${selectedLocation.lighted ? 'court-lighted' : 'court-unlighted'}`}>
                {selectedLocation.lighted ? '💡 Lighted – Night play OK' : '🌑 Not Lighted – Daytime only recommended'}
              </span>
            )}
          </div>

          {selectedLocation && (
            <div className="form-group">
              <label className="form-label">Court Selection</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.flexible} onChange={e => set('flexible', e.target.checked)} />
                <span className="text-sm">Flexible court – pick on arrival</span>
              </label>
              {!form.flexible && (
                <select className="form-select" value={form.courtNumber} onChange={e => set('courtNumber', e.target.value)}>
                  <option value="">Any court (flexible)</option>
                  {courtOptions.map(n => <option key={n} value={n}>Court {n}</option>)}
                </select>
              )}
            </div>
          )}

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input className="form-input" type="datetime-local" value={form.startTime} onChange={e => set('startTime', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input className="form-input" type="datetime-local" value={form.endTime} onChange={e => set('endTime', e.target.value)} required />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Format *</label>
              <select className="form-select" value={form.format} onChange={e => set('format', e.target.value)}>
                <option value="singles">Singles</option>
                <option value="doubles">Doubles</option>
                <option value="mixed">Mixed Doubles</option>
                <option value="practice">Practice / Hitting</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Stakes</label>
              <select className="form-select" value={form.stakes} onChange={e => set('stakes', e.target.value)}>
                <option value="casual">Casual</option>
                <option value="competitive">Competitive</option>
                <option value="social">Social</option>
                <option value="training">Training</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Min NTRP Level</label>
              <select className="form-select" value={form.levelMin} onChange={e => set('levelMin', e.target.value)}>
                {[1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0,5.5,6.0,6.5,7.0].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Max NTRP Level</label>
              <select className="form-select" value={form.levelMax} onChange={e => set('levelMax', e.target.value)}>
                {[1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0,5.5,6.0,6.5,7.0].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Warmup expectations, parking tips, any special notes…" maxLength={500} />
          </div>

          <button className="btn btn-primary btn-block btn-lg" disabled={loading || !form.locationId} type="submit">
            {loading ? 'Creating session…' : '📅 Create Meetup Plan'}
          </button>
        </form>
      </div>
    </div>
  );
}
