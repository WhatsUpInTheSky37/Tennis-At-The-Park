import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/auth'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const { login, register, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirect = (location.state as any)?.redirect || '/dashboard'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password, displayName)
      navigate(redirect)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="nav-logo" style={{ justifyContent: 'center', marginBottom: 8 }}>
            🎾 ULTIMATE TENNIS
          </div>
          <p className="text-muted">{mode === 'login' ? 'Welcome back' : 'Join the community'}</p>
        </div>

        <div className="card">
          <div className="tabs" style={{ marginBottom: 20 }}>
            <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Sign In</button>
            <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Create Account</button>
          </div>

          <form onSubmit={submit}>
            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="displayName">Display Name</label>
                <input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} required minLength={2} maxLength={50} placeholder="How you'll appear to others" />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" autoComplete="email" />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="Min 8 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>

            {error && <div className="alert alert-danger mb-4">{error}</div>}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {mode === 'register' && (
            <p className="text-xs text-muted mt-4" style={{ textAlign: 'center' }}>
              By joining, you agree to follow our <a href="/rules" className="text-accent">Community Rules</a>.
              Your email is never shown publicly.
            </p>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="btn btn-ghost text-sm" onClick={() => navigate('/')}>← Back to home</button>
        </div>
      </div>
    </div>
  )
}
