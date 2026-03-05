import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { api } from '../lib/api'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
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

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (resetNewPassword !== resetConfirm) {
      setError('Passwords do not match'); return
    }
    if (resetNewPassword.length < 8) {
      setError('Password must be at least 8 characters'); return
    }
    setResetLoading(true)
    try {
      await api.resetPassword(email, resetNewPassword)
      setResetSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally { setResetLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="nav-logo" style={{ justifyContent: 'center', marginBottom: 8 }}>
            🎾 ULTIMATE TENNIS
          </div>
          <p className="text-muted">
            {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Join the community' : 'Reset your password'}
          </p>
        </div>

        <div className="card">
          {mode !== 'reset' ? (
            <>
              <div className="tabs" style={{ marginBottom: 20 }}>
                <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError('') }}>Sign In</button>
                <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError('') }}>Create Account</button>
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

              {mode === 'login' && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <button className="btn btn-ghost btn-sm text-sm" onClick={() => { setMode('reset'); setError(''); setResetSuccess(false) }}>
                    Forgot password?
                  </button>
                </div>
              )}

              {mode === 'register' && (
                <p className="text-xs text-muted mt-4" style={{ textAlign: 'center' }}>
                  By joining, you agree to follow our <a href="/rules" className="text-accent">Community Rules</a>.
                  Your email is never shown publicly.
                </p>
              )}
            </>
          ) : (
            <>
              <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 16, fontSize: 22 }}>RESET PASSWORD</h3>

              {resetSuccess ? (
                <div>
                  <div className="alert alert-success mb-4">
                    If an account exists with that email, the password has been reset. You can now sign in with your new password.
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setMode('login'); setResetSuccess(false); setError('') }}>
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReset}>
                  <div className="form-group">
                    <label htmlFor="resetEmail">Email Address</label>
                    <input id="resetEmail" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" autoComplete="email" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="resetNewPw">New Password</label>
                    <input id="resetNewPw" type="password" value={resetNewPassword} onChange={e => setResetNewPassword(e.target.value)} required minLength={8} placeholder="Min 8 characters" autoComplete="new-password" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="resetConfirmPw">Confirm New Password</label>
                    <input id="resetConfirmPw" type="password" value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
                  </div>

                  {error && <div className="alert alert-danger mb-4">{error}</div>}

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={resetLoading}>
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: 12 }}>
                    <button type="button" className="btn btn-ghost btn-sm text-sm" onClick={() => { setMode('login'); setError('') }}>
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="btn btn-ghost text-sm" onClick={() => navigate('/')}>← Back to home</button>
        </div>
      </div>
    </div>
  )
}
