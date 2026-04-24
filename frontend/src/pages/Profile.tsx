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
const AVAILABILITY_OPTIONS = [
  'Weekday Mornings',
  'Weekday Afternoons',
  'Weekday Evenings',
  'Weekend Mornings',
  'Weekend Afternoons',
  'Weekend Evenings',
]

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
    photoUrl: '',
    yearsPlaying: null as number | null,
    favoritePro: '',
    phone: '',
    okToText: false,
    availability: [] as string[],
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
        photoUrl: p?.photoUrl || '',
        yearsPlaying: p?.yearsPlaying ?? null,
        favoritePro: p?.favoritePro || '',
        phone: p?.phone || '',
        okToText: p?.okToText || false,
        availability: p?.availability || [],
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

  const toggleAvailability = (slot: string) => {
    setForm((f: any) => {
      const current: string[] = f.availability || []
      return {
        ...f,
        availability: current.includes(slot)
          ? current.filter((x: string) => x !== slot)
          : [...current, slot]
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
  const availTimes: string[] = profile?.availability || []

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      {!isOwnProfile && (
        <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate(-1)}>← Back</button>
      )}
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
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/messages/${targetId}`)}>
                &#9993; Message
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowChallenge(true)}>
                &#9876;&#65039; Challenge
              </button>
            </div>
          )}
        </div>
      </div>

      {!editing ? (
        <div>
          {/* Profile Header Card with circular avatar top-left */}
          <div className="card mb-4">
            <div className="flex gap-4 items-start" style={{ padding: 0 }}>
              {/* Circular avatar - top left */}
              <div style={{
                width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                border: '3px solid var(--green-500)', background: 'var(--green-100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontFamily: 'var(--font-display)', color: 'var(--green-700)',
              }}>
                {profile?.photoUrl
                  ? <img src={profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : getInitials(profile?.displayName || '?')
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: 1 }}>
                  {profile?.displayName}
                </h2>
                <SkillDisplay level={profile?.skillLevel || 3} showLabel />
                <div className="flex gap-2 flex-wrap mt-2">
                  {profile?.lookingToPlay && <span className="badge badge-green">Looking to Play</span>}
                  <span className="badge badge-gray">
                    {profile?.handedness === 'left' ? 'Left-handed' : profile?.handedness === 'ambidextrous' ? 'Ambidextrous' : 'Right-handed'}
                  </span>
                </div>
              </div>
            </div>

            {profile?.bio && (
              <p className="text-sm" style={{ color: 'var(--gray-600)', borderTop: '1px solid var(--gray-100)', paddingTop: 12, marginTop: 12 }}>
                {profile.bio}
              </p>
            )}
          </div>

          {/* Player Details Card */}
          <div className="card mb-4">
            <div className="card-body">
              <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 16, fontSize: 18 }}>PLAYER DETAILS</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                <div>
                  <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skill Level</div>
                  <div className="text-sm font-bold">{profile?.skillLevel || 3} NTRP</div>
                </div>
                <div>
                  <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Handedness</div>
                  <div className="text-sm font-bold">{profile?.handedness === 'left' ? 'Left-handed' : profile?.handedness === 'ambidextrous' ? 'Ambidextrous' : 'Right-handed'}</div>
                </div>
                {profile?.yearsPlaying != null && (
                  <div>
                    <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Years Playing</div>
                    <div className="text-sm font-bold">{profile.yearsPlaying} {profile.yearsPlaying === 1 ? 'year' : 'years'}</div>
                  </div>
                )}
                {profile?.favoritePro && (
                  <div>
                    <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Favorite Pro</div>
                    <div className="text-sm font-bold">{profile.favoritePro}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preferred Formats Card */}
          <div className="card mb-4">
            <div className="card-body">
              <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 12, fontSize: 18 }}>PREFERRED FORMATS</h3>
              <div className="flex gap-2 flex-wrap">
                {formats.length > 0 ? formats.map((f: string) => (
                  <span key={f} className="badge badge-blue">{f}</span>
                )) : <span className="text-sm text-muted">No formats specified</span>}
              </div>
            </div>
          </div>

          {/* Availability Card */}
          {availTimes.length > 0 && (
            <div className="card mb-4">
              <div className="card-body">
                <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 12, fontSize: 18 }}>AVAILABLE FOR MATCHES</h3>
                <div className="flex gap-2 flex-wrap">
                  {availTimes.map((t: string) => (
                    <span key={t} className="badge badge-green">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Contact Card - only show if phone is shared */}
          {profile?.phone && (
            <div className="card mb-4">
              <div className="card-body">
                <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 12, fontSize: 18 }}>CONTACT</h3>
                <div className="text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-muted">Phone:</span>
                    <span className="font-bold">{profile.phone}</span>
                  </div>
                  {profile.okToText && (
                    <span className="badge badge-green">OK to text if running late</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {rating && (
            <div className="card mb-4">
              <div className="card-body">
                <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 16, fontSize: 18 }}>MATCH RECORD</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
                  <div className="text-center">
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--green-700)' }}>{rating.wins}</div>
                    <div className="text-xs text-muted">WINS</div>
                  </div>
                  <div className="text-center">
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--red)' }}>{rating.losses}</div>
                    <div className="text-xs text-muted">LOSSES</div>
                  </div>
                  <div className="text-center">
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--orange)' }}>{rating.currentStreak}</div>
                    <div className="text-xs text-muted">STREAK</div>
                  </div>
                  <div className="text-center">
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 36 }}>{rating.matchesPlayed}</div>
                    <div className="text-xs text-muted">MATCHES</div>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm mt-3" style={{ width: '100%' }} onClick={() => navigate('/leaderboards')}>
                  View Community Rankings →
                </button>
              </div>
            </div>
          )}

          {isOwnProfile && user?.enforcement && (
            <div className="card mb-4">
              <div className="card-body">
                <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 12, fontSize: 18 }}>ACCOUNT STATUS</h3>
                {user.enforcement.suspended ? (
                  <div className="alert alert-error">Account suspended. Contact support.</div>
                ) : user.enforcement.cooldownUntil && new Date(user.enforcement.cooldownUntil) > new Date() ? (
                  <div className="alert alert-warning">In cooldown until {new Date(user.enforcement.cooldownUntil).toLocaleString()}</div>
                ) : (
                  <div className="alert alert-success">Account in good standing</div>
                )}
                {user.enforcement.warningCount > 0 && (
                  <p className="text-sm text-muted mt-2">Warnings: {user.enforcement.warningCount}</p>
                )}
              </div>
            </div>
          )}

          {/* Change Password */}
          {isOwnProfile && (
            <div className="card mb-4">
              <div className="card-body">
                <div className="flex items-center justify-between" style={{ marginBottom: showChangePassword ? 16 : 0 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 18 }}>CHANGE PASSWORD</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowChangePassword(!showChangePassword); setPwError(''); setPwSuccess('') }}>
                    {showChangePassword ? 'Cancel' : 'Change'}
                  </button>
                </div>
                {showChangePassword && (
                  <form onSubmit={handleChangePassword}>
                    <div className="form-group mb-4">
                      <label className="form-label" htmlFor="currentPassword">Current Password *</label>
                      <input className="form-input" id="currentPassword" type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required autoComplete="current-password" />
                    </div>
                    <div className="form-group mb-4">
                      <label className="form-label" htmlFor="newPassword">New Password *</label>
                      <input className="form-input" id="newPassword" type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={8} placeholder="Min 8 characters" autoComplete="new-password" />
                    </div>
                    <div className="form-group mb-4">
                      <label className="form-label" htmlFor="confirmPassword">Confirm New Password *</label>
                      <input className="form-input" id="confirmPassword" type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} required minLength={8} autoComplete="new-password" />
                    </div>
                    {pwError && <div className="alert alert-error mb-4">{pwError}</div>}
                    {pwSuccess && <div className="alert alert-success mb-4">{pwSuccess}</div>}
                    <button type="submit" className="btn btn-primary btn-sm" disabled={pwSaving}>
                      {pwSaving ? 'Changing...' : 'Update Password'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={save}>
          <div className="card mb-4">
            <div className="card-body">
              <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 16 }}>EDIT PROFILE</h3>

              {/* Photo upload with circular preview */}
              <div className="form-group mb-4">
                <label className="form-label">Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                    border: '3px solid var(--green-500)', background: 'var(--green-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, fontFamily: 'var(--font-display)', color: 'var(--green-700)',
                  }}>
                    {form.photoUrl
                      ? <img src={form.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getInitials(form.displayName || '?')
                    }
                  </div>
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? 'Uploading...' : 'Upload Photo'}
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

              <div className="form-group mb-4">
                <label className="form-label" htmlFor="displayName">Name *</label>
                <input className="form-input" id="displayName" value={form.displayName} onChange={e => setForm((f: any) => ({ ...f, displayName: e.target.value }))} required minLength={2} maxLength={50} />
              </div>

              <div className="form-group mb-4">
                <label className="form-label" htmlFor="bio">Bio</label>
                <textarea className="form-textarea" id="bio" value={form.bio} onChange={e => setForm((f: any) => ({ ...f, bio: e.target.value }))} maxLength={500} placeholder="Tell the community about yourself..." />
              </div>

              <div className="grid-2 mb-4">
                <div className="form-group">
                  <label className="form-label" htmlFor="skill">Skill Level (NTRP 1-10)</label>
                  <select className="form-select" id="skill" value={form.skillLevel} onChange={e => setForm((f: any) => ({ ...f, skillLevel: parseFloat(e.target.value) }))}>
                    {[1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7].map(v => <option key={v} value={v}>{v} - {skillLabel(v)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="hand">Right / Left Handed</label>
                  <select className="form-select" id="hand" value={form.handedness} onChange={e => setForm((f: any) => ({ ...f, handedness: e.target.value }))}>
                    <option value="right">Right-handed</option>
                    <option value="left">Left-handed</option>
                    <option value="ambidextrous">Ambidextrous</option>
                  </select>
                </div>
              </div>

              <div className="grid-2 mb-4">
                <div className="form-group">
                  <label className="form-label" htmlFor="yearsPlaying">Years Playing</label>
                  <input className="form-input" id="yearsPlaying" type="number" min={0} max={80} value={form.yearsPlaying ?? ''} onChange={e => setForm((f: any) => ({ ...f, yearsPlaying: e.target.value === '' ? null : parseInt(e.target.value) }))} placeholder="e.g. 5" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="favoritePro">Favorite Pro</label>
                  <input className="form-input" id="favoritePro" value={form.favoritePro || ''} onChange={e => setForm((f: any) => ({ ...f, favoritePro: e.target.value }))} maxLength={100} placeholder="e.g. Roger Federer" />
                </div>
              </div>

              {/* Preferred Formats */}
              <div className="form-group mb-4">
                <label className="form-label">Preferred Formats</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {FORMAT_OPTIONS.map(fmt => (
                    <label key={fmt} style={{
                      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                      background: form.preferredFormats?.includes(fmt) ? 'var(--green-100)' : 'var(--gray-50)',
                      border: `1.5px solid ${form.preferredFormats?.includes(fmt) ? 'var(--green-500)' : 'var(--gray-200)'}`,
                      borderRadius: 8, padding: '8px 14px', transition: 'all 0.15s'
                    }}>
                      <input type="checkbox" checked={form.preferredFormats?.includes(fmt) || false} onChange={() => toggleFormat(fmt)} style={{ width: 'auto' }} />
                      <span className="text-sm font-bold">{fmt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Looking to Play */}
              <div className="form-group mb-4">
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  background: form.lookingToPlay ? 'var(--green-100)' : 'var(--gray-50)',
                  border: `1.5px solid ${form.lookingToPlay ? 'var(--green-500)' : 'var(--gray-200)'}`,
                  borderRadius: 8, padding: '10px 14px', transition: 'all 0.15s'
                }}>
                  <input type="checkbox" checked={form.lookingToPlay} onChange={e => setForm((f: any) => ({ ...f, lookingToPlay: e.target.checked }))} style={{ width: 'auto' }} />
                  <span className="text-sm font-bold">Looking to Play</span>
                </label>
              </div>

              {/* Times Available */}
              <div className="form-group mb-4">
                <label className="form-label">Times Usually Available for Matches</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {AVAILABILITY_OPTIONS.map(slot => (
                    <label key={slot} style={{
                      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                      background: form.availability?.includes(slot) ? 'var(--green-100)' : 'var(--gray-50)',
                      border: `1.5px solid ${form.availability?.includes(slot) ? 'var(--green-500)' : 'var(--gray-200)'}`,
                      borderRadius: 8, padding: '8px 12px', transition: 'all 0.15s',
                      fontSize: '0.85rem',
                    }}>
                      <input type="checkbox" checked={form.availability?.includes(slot) || false} onChange={() => toggleAvailability(slot)} style={{ width: 'auto' }} />
                      <span className="font-semibold">{slot}</span>
                    </label>
                  ))}
                </div>
              </div>

              <hr className="divider" />

              {/* Contact Info */}
              <h4 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 12 }}>CONTACT INFO (OPTIONAL)</h4>
              <div className="form-group mb-4">
                <label className="form-label" htmlFor="phone">Phone # (optional)</label>
                <input className="form-input" id="phone" type="tel" value={form.phone || ''} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} maxLength={20} placeholder="e.g. (555) 123-4567" />
                <span className="form-hint">Only visible to other registered players</span>
              </div>

              <div className="form-group mb-4">
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  background: form.okToText ? 'var(--green-100)' : 'var(--gray-50)',
                  border: `1.5px solid ${form.okToText ? 'var(--green-500)' : 'var(--gray-200)'}`,
                  borderRadius: 8, padding: '10px 14px', transition: 'all 0.15s'
                }}>
                  <input type="checkbox" checked={form.okToText} onChange={e => setForm((f: any) => ({ ...f, okToText: e.target.checked }))} style={{ width: 'auto' }} />
                  <span className="text-sm font-bold">OK to text if running late</span>
                </label>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error mb-4">{error}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={saving || uploading}>
            {saving ? 'Saving...' : 'Save Profile'}
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
