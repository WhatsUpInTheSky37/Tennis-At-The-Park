import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { skillLabel, getInitials, formatDate } from '../lib/utils'
import SkillDisplay from '../components/SkillDisplay'
import ChallengeModal from '../components/ChallengeModal'

type NotificationPrefs = {
  emailNotifications: boolean
}

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

const BANNER_PRESETS: Record<string, string> = {
  court: 'linear-gradient(135deg, #0b3d2e 0%, #0a0c0f 100%)',
  night: 'linear-gradient(135deg, #0c1a3a 0%, #05060a 100%)',
  sunset: 'linear-gradient(135deg, #ff7e3f 0%, #7a1f4b 100%)',
  clay: 'linear-gradient(135deg, #c1572e 0%, #2a1611 100%)',
  grass: 'linear-gradient(135deg, #2f7d32 0%, #0c2a14 100%)',
  hardcourt: 'linear-gradient(135deg, #1d6fb8 0%, #0a1a2a 100%)',
}
const DEFAULT_BANNER = 'court'
const bannerStyle = (key?: string | null) => BANNER_PRESETS[key || DEFAULT_BANNER] || BANNER_PRESETS[DEFAULT_BANNER]

const HOME_COURTS = ['City Park Courts', 'Winterplace Park Courts']
const PLAY_STYLES = ['Baseliner', 'Serve & Volley', 'All-Court', 'Counterpuncher', 'Aggressive']

// Auto-earned achievement badges from a player's record.
function computeBadges(rating: any, trophyCount: number, isInstructor: boolean): { icon: string; label: string }[] {
  const out: { icon: string; label: string }[] = []
  if (trophyCount > 0) out.push({ icon: '🏆', label: trophyCount > 1 ? `${trophyCount}× Champion` : 'Champion' })
  const w = rating?.wins || 0
  const winMilestone = [50, 25, 10, 1].find(m => w >= m)
  if (winMilestone) out.push({ icon: winMilestone >= 25 ? '🌟' : winMilestone >= 10 ? '⭐' : '🥇', label: winMilestone === 1 ? 'First Win' : `${winMilestone} Wins` })
  const streak = rating?.currentStreak || 0
  if (streak >= 3) out.push({ icon: '🔥', label: `${streak}-Win Streak` })
  if ((rating?.matchesPlayed || 0) >= 100) out.push({ icon: '💯', label: 'Century Club' })
  if (isInstructor) out.push({ icon: '🎓', label: 'Instructor' })
  return out
}

export default function Profile() {
  const { userId } = useParams()
  const { user, refresh, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isOwnProfile = !userId || userId === user?.id
  const targetId = userId || user?.id
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<any>(null)
  const [rating, setRating] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [wins, setWins] = useState<any[]>([])
  const [editing, setEditing] = useState(isOwnProfile && searchParams.get('edit') === '1')
  const [showChallenge, setShowChallenge] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs | null>(null)
  const [notifSaving, setNotifSaving] = useState(false)
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
    isInstructor: false,
    acceptingClients: false,
    availability: [] as string[],
    bannerColor: DEFAULT_BANNER,
    homeCourt: '',
    playStyle: '',
    favoriteShot: '',
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
        isInstructor: p?.isInstructor || false,
        acceptingClients: p?.acceptingClients || false,
        availability: p?.availability || [],
        bannerColor: p?.bannerColor || DEFAULT_BANNER,
        homeCourt: p?.homeCourt || '',
        playStyle: p?.playStyle || '',
        favoriteShot: p?.favoriteShot || '',
      })
    })
    api.getStats(targetId).then(s => { setRating(s?.rating); setStats(s) })
    api.getChallengeWins(targetId).then(setWins).catch(() => {})
  }, [targetId])

  // Load notification prefs for own profile
  useEffect(() => {
    if (!isOwnProfile) return
    api.getNotificationPrefs()
      .then(p => setNotifPrefs({ emailNotifications: p.emailNotifications }))
      .catch(() => {})
  }, [isOwnProfile, user?.id])

  // Re-sync editing state when arriving with ?edit=1 from the top nav
  useEffect(() => {
    if (isOwnProfile && searchParams.get('edit') === '1' && !editing) setEditing(true)
  }, [searchParams, isOwnProfile])

  const toggleEmailNotifications = async () => {
    if (!notifPrefs) return
    const next = !notifPrefs.emailNotifications
    setNotifPrefs({ emailNotifications: next })
    setNotifSaving(true)
    try {
      await api.updateNotificationPrefs({ emailNotifications: next })
      await refresh()
    } catch {
      setNotifPrefs({ emailNotifications: !next })
    } finally { setNotifSaving(false) }
  }

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
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const next = !editing
                  setEditing(next)
                  const params = new URLSearchParams(searchParams)
                  if (next) params.set('edit', '1'); else params.delete('edit')
                  setSearchParams(params, { replace: true })
                }}
              >
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
          {/* Profile header with cover banner + overlapping avatar */}
          <div className="card mb-4" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ height: 110, background: bannerStyle(profile?.bannerColor) }} />
            <div style={{ padding: '0 18px 18px' }}>
              <div style={{
                width: 92, height: 92, borderRadius: '50%', overflow: 'hidden', marginTop: -46,
                border: '4px solid var(--bg2)', background: 'var(--green-100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, fontFamily: 'var(--font-display)', color: 'var(--green-700)',
              }}>
                {profile?.photoUrl
                  ? <img src={profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : getInitials(profile?.displayName || '?')
                }
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: 1, marginTop: 10 }}>
                {profile?.displayName}
              </h2>
              <SkillDisplay level={profile?.skillLevel || 3} showLabel />
              <div className="flex gap-2 flex-wrap mt-2">
                {profile?.isInstructor && (
                  <span className="badge badge-instructor">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 4 }}><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                    Certified Instructor
                  </span>
                )}
                {profile?.isInstructor && profile?.acceptingClients && (
                  <span className="badge badge-green" style={{ animation: 'pulse 2s infinite' }}>Taking New Clients</span>
                )}
                {profile?.lookingToPlay && <span className="badge badge-green">Looking to Play</span>}
                <span className="badge badge-gray">
                  {profile?.handedness === 'left' ? 'Left-handed' : profile?.handedness === 'ambidextrous' ? 'Ambidextrous' : 'Right-handed'}
                </span>
                {profile?.homeCourt && <span className="badge badge-blue">📍 {profile.homeCourt.replace(' Courts', '')}</span>}
              </div>
              <div className="text-xs text-muted mt-2">
                {stats?.rank ? `Rank #${stats.rank} of ${stats.totalRanked} · ` : ''}
                {profile?.user?.createdAt ? `Member since ${formatDate(profile.user.createdAt)}` : ''}
              </div>
              {profile?.bio && (
                <p className="text-sm" style={{ color: 'var(--text2)', borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
                  {profile.bio}
                </p>
              )}
            </div>
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
                {profile?.homeCourt && (
                  <div>
                    <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Home Court</div>
                    <div className="text-sm font-bold">{profile.homeCourt}</div>
                  </div>
                )}
                {profile?.playStyle && (
                  <div>
                    <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Playing Style</div>
                    <div className="text-sm font-bold">{profile.playStyle}</div>
                  </div>
                )}
                {profile?.favoriteShot && (
                  <div>
                    <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Favorite Shot</div>
                    <div className="text-sm font-bold">{profile.favoriteShot}</div>
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

          {/* Stat strip */}
          {rating && (() => {
            const decided = (rating.wins || 0) + (rating.losses || 0)
            const winPct = decided > 0 ? Math.round((rating.wins / decided) * 100) + '%' : '—'
            const tiles = [
              { v: winPct, l: 'WIN %', c: 'var(--accent)' },
              { v: `${rating.wins}-${rating.losses}`, l: 'W–L', c: 'var(--text)' },
              { v: rating.currentStreak, l: 'STREAK', c: 'var(--orange)' },
              { v: rating.matchesPlayed, l: 'MATCHES', c: 'var(--text)' },
              { v: stats?.rank ? `#${stats.rank}` : '—', l: 'RANK', c: 'var(--text)' },
              { v: wins.length, l: 'TROPHIES', c: 'var(--accent)' },
            ]
            return (
              <div className="card mb-4">
                <div className="card-body">
                  <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 16, fontSize: 18 }}>MATCH RECORD</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 12 }}>
                    {tiles.map(t => (
                      <div key={t.l} className="text-center">
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: t.c }}>{t.v}</div>
                        <div className="text-xs text-muted">{t.l}</div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-ghost btn-sm mt-3" style={{ width: '100%' }} onClick={() => navigate('/leaderboards')}>
                    View Community Rankings →
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Achievements */}
          {(() => {
            const badges = computeBadges(rating, wins.length, profile?.isInstructor)
            if (badges.length === 0) return null
            return (
              <div className="card mb-4">
                <div className="card-body">
                  <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 14, fontSize: 18 }}>🎖️ ACHIEVEMENTS</h3>
                  <div className="flex gap-2 flex-wrap">
                    {badges.map(b => (
                      <span key={b.label} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 20,
                        padding: '6px 12px', fontSize: 13, fontWeight: 600
                      }}>
                        <span style={{ fontSize: 16 }}>{b.icon}</span>{b.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Recent matches */}
          {stats?.recentMatches?.length > 0 && (
            <div className="card mb-4">
              <div className="card-body">
                <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 14, fontSize: 18 }}>RECENT MATCHES</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.recentMatches.slice(0, 5).map((m: any) => {
                    const t = m.teamsJson || {}
                    const inT1 = (t.team1 || []).includes(targetId)
                    const opp = inT1 ? (t.team2 || []) : (t.team1 || [])
                    const won = (m.winnerUserIdsJson || []).includes(targetId)
                    const scoreStr = (m.scoreJson || []).map((s: any) => Array.isArray(s) ? s.join('-') : s).join(', ')
                    const oppNames = opp.map((id: string) => stats.playerNames?.[id] || 'Player').join(' & ') || '—'
                    return (
                      <div key={m.id} className="flex items-center justify-between" style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span className={`badge ${won ? 'badge-green' : 'badge-red'}`} style={{ minWidth: 24, textAlign: 'center' }}>{won ? 'W' : 'L'}</span>
                          <div style={{ minWidth: 0 }}>
                            <div className="text-sm font-bold" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>vs {oppNames}</div>
                            <div className="text-xs text-muted">{m.format} · {formatDate(m.playedAt)}</div>
                          </div>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{scoreStr || '—'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Challenge trophy case */}
          {wins.length > 0 && (
            <div className="card mb-4">
              <div className="card-body">
                <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 16, fontSize: 18 }}>
                  🏆 CHALLENGES WON ({wins.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {wins.map(w => (
                    <div
                      key={w.eventId}
                      className="clickable"
                      onClick={() => navigate(`/challenge-events/${w.eventId}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                        background: 'var(--bg3)', borderRadius: 10, padding: '10px 14px',
                        borderLeft: '3px solid var(--accent)'
                      }}
                    >
                      <span style={{ fontSize: 26 }}>🏆</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="font-bold" style={{ lineHeight: 1.3 }}>{w.name}</div>
                        <div className="text-xs text-muted">
                          Champion · {w.format} · {formatDate(w.date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                <label className="form-label">Profile Banner</label>
                <div style={{ height: 60, borderRadius: 10, background: bannerStyle(form.bannerColor), marginBottom: 10, border: '1px solid var(--border)' }} />
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(BANNER_PRESETS).map(key => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setForm((f: any) => ({ ...f, bannerColor: key }))}
                      title={key}
                      style={{
                        width: 40, height: 40, borderRadius: 8, background: BANNER_PRESETS[key], cursor: 'pointer',
                        border: form.bannerColor === key ? '3px solid var(--accent)' : '1px solid var(--border)'
                      }}
                    />
                  ))}
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

              <div className="grid-2 mb-4">
                <div className="form-group">
                  <label className="form-label" htmlFor="homeCourt">Home Court</label>
                  <select className="form-select" id="homeCourt" value={form.homeCourt || ''} onChange={e => setForm((f: any) => ({ ...f, homeCourt: e.target.value }))}>
                    <option value="">No preference</option>
                    {HOME_COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="playStyle">Playing Style</label>
                  <select className="form-select" id="playStyle" value={form.playStyle || ''} onChange={e => setForm((f: any) => ({ ...f, playStyle: e.target.value }))}>
                    <option value="">Not specified</option>
                    {PLAY_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label" htmlFor="favoriteShot">Favorite Shot</label>
                <input className="form-input" id="favoriteShot" value={form.favoriteShot || ''} onChange={e => setForm((f: any) => ({ ...f, favoriteShot: e.target.value }))} maxLength={40} placeholder="e.g. Topspin forehand, kick serve, backhand slice" />
              </div>

              {/* Instructor */}
              <div className="form-group mb-4">
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  background: form.isInstructor ? 'var(--accent-dim)' : 'var(--gray-50)',
                  border: `1.5px solid ${form.isInstructor ? 'var(--accent)' : 'var(--gray-200)'}`,
                  borderRadius: 8, padding: '10px 14px', transition: 'all 0.15s'
                }}>
                  <input type="checkbox" checked={form.isInstructor} onChange={e => setForm((f: any) => ({ ...f, isInstructor: e.target.checked, acceptingClients: e.target.checked ? f.acceptingClients : false }))} style={{ width: 'auto' }} />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: form.isInstructor ? 'var(--accent)' : 'var(--text3)' }}><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                  <span className="text-sm font-bold">I'm a Tennis Instructor</span>
                </label>
              </div>

              {form.isInstructor && (
                <div className="form-group mb-4" style={{ marginLeft: 16 }}>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    background: form.acceptingClients ? 'var(--green-100)' : 'var(--gray-50)',
                    border: `1.5px solid ${form.acceptingClients ? 'var(--green-500)' : 'var(--gray-200)'}`,
                    borderRadius: 8, padding: '10px 14px', transition: 'all 0.15s'
                  }}>
                    <input type="checkbox" checked={form.acceptingClients} onChange={e => setForm((f: any) => ({ ...f, acceptingClients: e.target.checked }))} style={{ width: 'auto' }} />
                    <span className="text-sm font-bold">Accepting New Clients</span>
                  </label>
                  <span className="form-hint">Let players know you're available for lessons</span>
                </div>
              )}

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

      {isOwnProfile && notifPrefs && (
        <div className="card mb-4" style={{ marginTop: 16 }}>
          <div className="card-body">
            <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 18, marginBottom: 12 }}>
              NOTIFICATION SETTINGS
            </h3>
            <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
              In-app notifications — the 🔔 bell, badges, and dashboard cards — are always on. The only choice is whether to also get an email.
            </p>
            <label
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, cursor: notifSaving ? 'wait' : 'pointer',
                background: notifPrefs.emailNotifications ? 'var(--green-100)' : 'var(--gray-50)',
                border: `1.5px solid ${notifPrefs.emailNotifications ? 'var(--green-500)' : 'var(--gray-200)'}`,
                borderRadius: 8, padding: '10px 14px', transition: 'all 0.15s',
                opacity: notifSaving ? 0.7 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={notifPrefs.emailNotifications}
                disabled={notifSaving}
                onChange={toggleEmailNotifications}
                style={{ width: 'auto', marginTop: 3 }}
              />
              <div style={{ flex: 1 }}>
                <div className="text-sm font-bold">✉️ Also email me my notifications</div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  When on, messages, challenges, forum replies &amp; mentions, and session invites are also emailed to <strong>{user?.email}</strong>. Turn this off to keep notifications in the app only.
                </div>
              </div>
            </label>
          </div>
        </div>
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
