import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { skillLabel, getInitials } from '../lib/utils'
import SkillDisplay from '../components/SkillDisplay'
import ChallengeModal from '../components/ChallengeModal'

const CLOUDINARY_CLOUD = 'dph3sgfc3'
const CLOUDINARY_UPLOAD_PRESET = 'ultimate_tennis_avatars'
const FORMAT_OPTIONS = ['Singles', 'Doubles', 'Mixed Doubles']

export default function Profile() {
  const { userId } = useParams()
  const { user, refresh, logout } = useAuth()
  const navigate = useNavigate()
  const isOwnProfile = !userId || userId === user?.id
  const targetId = userId || user?.id
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<any>(null)
  const [rating, setRating] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [showChallenge, setShowChallenge] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [form, setForm] = useState<any>({
    displayName: '',
    skillLevel: 3,
    handedness: 'right',
    bio: '',
    lookingToPlay: false,
    preferredFormats: [] as string[],
    photoUrl: ''
  })

  useEffect(() => {
    if (!targetId) return
    api.getProfile(targetId).then(p => {
      setProfile(p)
      setForm({
        displayName: p?.displayName || '',
        skillLevel: p?.skillLevel || 3,
        handedness: p?.handedness || 'right',
        bio: p?.bio || '',
        lookingToPlay: p?.lookingToPlay || false,
        preferredFormats: p?.preferredFormats || [],
        photoUrl: p?.photoUrl || ''
      })
    })
    api.getStats(targetId).then(s => setRating(s?.rating))
  }, [targetId])

  const toggleFormat = (fmt: string) => {
    setForm((f: any) => {
      const current: string[] = f.preferredFormats || []
      return {
        ...f,
        preferredFormats: current.includes(fmt)
          ? current.filter((x: string) => x !== fmt)
          : [...current, fmt]
      }
    })
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      setForm((f: any) => ({ ...f, photoUrl: data.secure_url }))
    } catch (err: any) {
      setError('Photo upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.updateMyProfile(form)
      await refresh()
      setEditing(false)
      api.getProfile(targetId!).then(setProfile)
    } catch (err: any) {
      setError(err.message)
    } finally { setSaving(false) }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError(''); setPwSuccess('')
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match'); return
    }
    if (pwForm.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters'); return
    }
    setPwSaving(true)
    try {
      await api.changePassword(pwForm.currentPassword, pwForm.newPassword)
      setPwSuccess('Password changed successfully!')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      setPwError(err.message)
    } finally { setPwSaving(false) }
  }

  if (!profile && !isOwnProfile) return <div className="page"><div className="loading-screen"><div className="spinner" /></div></div>

  const formats: string[] = profile?.preferredFormats || []

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="page-header flex items-center justify-between">
        <h1 className="page-title">PROFILE</h1>
        <div className="flex gap-2">
          {isOwnProfile ? (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(!editing)}>
                {editing ? 'Cancel' : 'Edit'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/') }}>Sign Out</button>
            </>
          ) : user && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowChallenge(true)}>
              &#9876;&#65039; Challenge
            </button>
          )}
        </div>
      </div>

      {!editing ? (
        <div>
          <div className="card mb-4">
            <div className="flex gap-4 items-center mb-4">
              <div className="avatar" style={{ width: 72, height: 72, fontSize: 24, background: 'var(--accent-dim)' }}>
                {profile?.photoUrl
                  ? <img src={profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : getInitials(profile?.displayName || '?')
                }
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: 1 }}>
                  {profile?.displayName}
                </h2>
                <SkillDisplay level={profile?.skillLevel || 3} showLabel />
                <div className="flex gap-2 flex-wrap mt-2">
                  {profile?.lookingToPlay && <span className="badge badge-green">🟢 Looking to Play</span>}
                  {formats.map((f: string) => (
                    <span key={f} className="badge badge-blue">{f}</span>
                  ))}
                </div>
              </div>
            </div>

            {profile?.bio && (
              <p className="text-sm" style={{ color: 'var(--text2)', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                {profile.bio}
              </p>
            )}

            <div className="flex gap-3 flex-wrap mt-3">
              <span className="badge badge-gray">
                {profile?.handedness === 'left' ? '🤚 Left-handed' : profile?.handedness === 'ambidextrous' ? '🙌 Ambidextrous' : '✋ Right-handed'}
              </span>
            </div>
          </div>

          {/* Stats — no Elo */}
          {rating && (
            <div className="card mb-4">
              <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 16, fontSize: 18 }}>MATCH RECORD</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
                <div className="text-center">
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--accent)' }}>{rating.wins}</div>
                  <div className="text-xs text-muted">WINS</div>
                </div>
                <div className="text-center">
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--red)' }}>{rating.losses}</div>
                  <div className="text-xs text-muted">LOSSES</div>
                </div>
                <div className="text-center">
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--orange)' }}>{rating.currentStreak}</div>
                  <div className="text-xs text-muted">STREAK 🔥</div>
                </div>
                <div className="text-center">
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 36 }}>{rating.matchesPlayed}</div>
                  <div className="text-xs text-muted">MATCHES</div>
                </div>
              </div>
            </div>
          )}

          {isOwnProfile && user?.enforcement && (
            <div className="card mb-4">
              <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 12, fontSize: 18 }}>ACCOUNT STATUS</h3>
              {user.enforcement.suspended ? (
                <div className="alert alert-danger">⛔ Account suspended. Contact support.</div>
              ) : user.enforcement.cooldownUntil && new Date(user.enforcement.cooldownUntil) > new Date() ? (
                <div className="alert alert-warning">⏳ In cooldown until {new Date(user.enforcement.cooldownUntil).toLocaleString()}</div>
              ) : (
                <div className="alert alert-info">✅ Account in good standing</div>
              )}
              {user.enforcement.warningCount > 0 && (
                <p className="text-sm text-muted mt-2">Warnings: {user.enforcement.warningCount}</p>
              )}
            </div>
          )}

          {/* Change Password */}
          {isOwnProfile && (
            <div className="card mb-4">
              <div className="flex items-center justify-between" style={{ marginBottom: showChangePassword ? 16 : 0 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 18 }}>CHANGE PASSWORD</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowChangePassword(!showChangePassword); setPwError(''); setPwSuccess('') }}>
                  {showChangePassword ? 'Cancel' : 'Change'}
                </button>
              </div>
              {showChangePassword && (
                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label htmlFor="currentPassword">Current Password *</label>
                    <input id="currentPassword" type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required autoComplete="current-password" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="newPassword">New Password *</label>
                    <input id="newPassword" type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={8} placeholder="Min 8 characters" autoComplete="new-password" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm New Password *</label>
                    <input id="confirmPassword" type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} required minLength={8} autoComplete="new-password" />
                  </div>
                  {pwError && <div className="alert alert-danger mb-4">{pwError}</div>}
                  {pwSuccess && <div className="alert alert-success mb-4">{pwSuccess}</div>}
                  <button type="submit" className="btn btn-primary btn-sm" disabled={pwSaving}>
                    {pwSaving ? 'Changing...' : 'Update Password'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={save}>
          <div className="card mb-4">
            <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 16 }}>EDIT PROFILE</h3>

            {/* Photo upload */}
            <div className="form-group">
              <label>Profile Photo</label>
              <div className="flex items-center gap-4">
                <div className="avatar" style={{ width: 64, height: 64, fontSize: 22, background: 'var(--accent-dim)', flexShrink: 0 }}>
                  {form.photoUrl
                    ? <img src={form.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : getInitials(form.displayName || '?')
                  }
                </div>
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? '⏳ Uploading…' : '📷 Upload Photo'}
                  </button>
                  {form.photoUrl && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm((f: any) => ({ ...f, photoUrl: '' }))} style={{ marginLeft: 8 }}>
                      Remove
                    </button>
                  )}
                  <p className="text-xs text-muted mt-2">JPG, PNG or GIF. Max 10MB.</p>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="displayName">Display Name *</label>
              <input id="displayName" value={form.displayName} onChange={e => setForm((f: any) => ({ ...f, displayName: e.target.value }))} required minLength={2} maxLength={50} />
            </div>

            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea id="bio" value={form.bio} onChange={e => setForm((f: any) => ({ ...f, bio: e.target.value }))} maxLength={500} placeholder="Tell the community about yourself…" />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label htmlFor="skill">Skill Level (NTRP)</label>
                <select id="skill" value={form.skillLevel} onChange={e => setForm((f: any) => ({ ...f, skillLevel: parseFloat(e.target.value) }))}>
                  {[1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7].map(v => <option key={v} value={v}>{v} – {skillLabel(v)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="hand">Handedness</label>
                <select id="hand" value={form.handedness} onChange={e => setForm((f: any) => ({ ...f, handedness: e.target.value }))}>
                  <option value="right">Right-handed</option>
                  <option value="left">Left-handed</option>
                  <option value="ambidextrous">Ambidextrous</option>
                </select>
              </div>
            </div>

            {/* Looking to Play + Preferred Formats side by side */}
            <div className="form-group">
              <label>Availability & Preferred Formats</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                {/* Looking to Play */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  background: form.lookingToPlay ? 'var(--accent-dim)' : 'var(--bg3)',
                  border: `1px solid ${form.lookingToPlay ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 8, padding: '8px 14px', transition: 'all 0.15s'
                }}>
                  <input type="checkbox" checked={form.lookingToPlay} onChange={e => setForm((f: any) => ({ ...f, lookingToPlay: e.target.checked }))} style={{ width: 'auto' }} />
                  <span className="text-sm font-bold">🟢 Looking to Play</span>
                </label>

                {/* Format checkboxes */}
                {FORMAT_OPTIONS.map(fmt => (
                  <label key={fmt} style={{
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    background: form.preferredFormats?.includes(fmt) ? 'rgba(75,158,255,0.12)' : 'var(--bg3)',
                    border: `1px solid ${form.preferredFormats?.includes(fmt) ? 'var(--blue)' : 'var(--border)'}`,
                    borderRadius: 8, padding: '8px 14px', transition: 'all 0.15s'
                  }}>
                    <input type="checkbox" checked={form.preferredFormats?.includes(fmt) || false} onChange={() => toggleFormat(fmt)} style={{ width: 'auto' }} />
                    <span className="text-sm font-bold">{fmt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {error && <div className="alert alert-danger mb-4">{error}</div>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving || uploading}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      )}

      {showChallenge && targetId && profile && (
        <ChallengeModal
          targetUserId={targetId}
          targetName={profile.displayName || 'Player'}
          onClose={() => setShowChallenge(false)}
        />
      )}
    </div>
  )
}
