import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { ErrorMsg } from '../components/ui/helpers';

export default function Register() {
  const [form, setForm] = useState({
    email: '', password: '', displayName: '', skillLevel: 3.0, handedness: 'right'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setToken, fetchMe } = useAuthStore();
  const navigate = useNavigate();

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post<{ token: string }>('/auth/register', form);
      setToken(res.token);
      await fetchMe();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)', padding: 16 }}>
      <Link to="/" className="logo display" style={{ fontSize: '2rem', color: 'var(--green-700)', marginBottom: 24, textDecoration: 'none' }}>
        🎾 ULTIMATE TENNIS
      </Link>
      <div className="card" style={{ width: '100%', maxWidth: 460 }}>
        <div className="card-body" style={{ padding: 28 }}>
          <h2 style={{ marginBottom: 6 }}>Create your profile</h2>
          <p className="text-sm text-muted" style={{ marginBottom: 20 }}>No install needed — use in your browser!</p>
          <ErrorMsg error={error} />
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: error ? 12 : 0 }}>
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input className="form-input" value={form.displayName} onChange={e => set('displayName', e.target.value)} required minLength={2} maxLength={50} placeholder="How others will see you" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
              <span className="form-hint">Never shown publicly</span>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={8} placeholder="Min 8 characters" />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Skill Level (NTRP)</label>
                <select className="form-select" value={form.skillLevel} onChange={e => set('skillLevel', parseFloat(e.target.value))}>
                  {[1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0,5.5,6.0,6.5,7.0].map(v => (
                    <option key={v} value={v}>{v} – {v < 2.5 ? 'Beginner' : v < 3.5 ? 'Intermediate' : v < 4.5 ? 'Advanced' : 'Expert'}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Handedness</label>
                <select className="form-select" value={form.handedness} onChange={e => set('handedness', e.target.value)}>
                  <option value="right">Right-handed</option>
                  <option value="left">Left-handed</option>
                  <option value="ambidextrous">Ambidextrous</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary btn-block btn-lg" disabled={loading} type="submit">
              {loading ? 'Creating profile…' : '🎾 Join Ultimate Tennis'}
            </button>
          </form>
          <p className="text-center text-sm text-muted" style={{ marginTop: 16 }}>
            Already have an account? <Link to="/login">Sign in →</Link>
          </p>
          <p className="text-xs text-muted text-center" style={{ marginTop: 8 }}>
            By joining, you agree to follow our <Link to="/rules">community rules</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
