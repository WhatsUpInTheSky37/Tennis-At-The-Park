import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { ErrorMsg } from '../components/ui/helpers';

export default function EditProfile() {
  const { user, fetchMe, logout } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    displayName: '', skillLevel: 3.0, handedness: 'right',
    preferredFormats: [] as string[], bio: '', photoUrl: '',
  });

  useEffect(() => {
    if (user?.profile) {
      setForm({
        displayName: user.profile.displayName || '',
        skillLevel: user.profile.skillLevel || 3.0,
        handedness: (user.profile as any).handedness || 'right',
        preferredFormats: (user.profile as any).preferredFormats || [],
        bio: (user.profile as any).bio || '',
        photoUrl: user.profile.photoUrl || '',
      });
    }
  }, [user]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const toggleFormat = (f: string) => {
    setForm(prev => ({
      ...prev,
      preferredFormats: prev.preferredFormats.includes(f)
        ? prev.preferredFormats.filter(x => x !== f)
        : [...prev.preferredFormats, f],
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.put('/profiles/me', {
        displayName: form.displayName,
        skillLevel: parseFloat(form.skillLevel as any),
        handedness: form.handedness,
        preferredFormats: form.preferredFormats,
        bio: form.bio || undefined,
        photoUrl: form.photoUrl || null,
      });
      await fetchMe();
      navigate('/profile');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 520 }}>
        <h1 className="display" style={{ fontSize: '2rem', marginBottom: 24 }}>EDIT PROFILE</h1>
        <form onSubmit={submit} className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ErrorMsg error={error} />
          <div className="form-group">
            <label className="form-label">Display Name *</label>
            <input className="form-input" value={form.displayName} onChange={e => set('displayName', e.target.value)} required minLength={2} maxLength={50} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">NTRP Skill Level</label>
              <select className="form-select" value={form.skillLevel} onChange={e => set('skillLevel', e.target.value)}>
                {[1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0,5.5,6.0,6.5,7.0].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Handedness</label>
              <select className="form-select" value={form.handedness} onChange={e => set('handedness', e.target.value)}>
                <option value="right">Right</option>
                <option value="left">Left</option>
                <option value="ambidextrous">Ambidextrous</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Preferred Formats</label>
            <div className="pill-row">
              {['singles', 'doubles', 'mixed', 'practice'].map(f => (
                <button key={f} type="button"
                  className={`btn btn-sm ${form.preferredFormats.includes(f) ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => toggleFormat(f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Bio (optional)</label>
            <textarea className="form-textarea" value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Tell the community about yourself…" maxLength={500} />
          </div>
          <div className="form-group">
            <label className="form-label">Profile Photo URL (optional)</label>
            <input className="form-input" type="url" value={form.photoUrl} onChange={e => set('photoUrl', e.target.value)} placeholder="https://…" />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={loading} type="submit">{loading ? 'Saving…' : 'Save Changes'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/profile')}>Cancel</button>
          </div>
        </form>

        <div className="card card-body mt-4" style={{ borderTop: '3px solid var(--red)' }}>
          <h4 style={{ color: 'var(--red)', marginBottom: 8 }}>Account</h4>
          <button className="btn btn-danger btn-sm" onClick={() => { logout(); navigate('/'); }}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}
