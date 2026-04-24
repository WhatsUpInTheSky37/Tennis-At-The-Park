import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { ErrorMsg } from '../components/ui/helpers';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setToken, fetchMe } = useAuthStore();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post<{ token: string }>('/auth/login', { email, password });
      setToken(res.token);
      await fetchMe();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)', padding: 16 }}>
      <Link to="/" className="logo display" style={{ fontSize: '2rem', color: 'var(--green-700)', marginBottom: 32, textDecoration: 'none' }}>
        🎾 TENNIS AT THE PARK
      </Link>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div className="card-body" style={{ padding: 28 }}>
          <h2 style={{ marginBottom: 24 }}>Welcome back</h2>
          <ErrorMsg error={error} />
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: error ? 12 : 0 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <button className="btn btn-primary btn-block btn-lg" disabled={loading} type="submit">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-muted" style={{ marginTop: 20 }}>
            No account? <Link to="/register">Join for free →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
