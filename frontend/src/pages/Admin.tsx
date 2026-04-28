import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { formatRelative, getInitials } from '../lib/utils'
import { format } from 'date-fns'

function UserDetailModal({ userId, onClose, onChanged }: { userId: string; onClose: () => void; onChanged: () => void }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { user: me } = useAuth()

  useEffect(() => {
    setLoading(true)
    api.adminGetUser(userId).then(setUser).finally(() => setLoading(false))
  }, [userId])

  const isSelf = me?.id === userId

  const refresh = async () => {
    const u = await api.adminGetUser(userId)
    setUser(u)
    onChanged()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16,
    }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 640, width: '100%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        {loading || !user ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3" style={{ flexWrap: 'wrap' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', overflow: 'hidden',
                background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontFamily: 'var(--font-display)', color: 'var(--accent)', flexShrink: 0,
              }}>
                {user.profile?.photoUrl
                  ? <img src={user.profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : getInitials(user.profile?.displayName || user.email)
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ marginBottom: 2 }}>{user.profile?.displayName || '(no name)'}</h2>
                <div className="text-sm text-muted">{user.email}</div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Joined {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  {user.lastActive && ` · last active ${formatRelative(user.lastActive)}`}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {user.isAdmin && <span className="badge badge-orange">Admin</span>}
                  {user.profile?.isInstructor && <span className="badge">Instructor</span>}
                  {user.enforcement?.suspended && <span className="badge badge-red">Suspended</span>}
                  {user.enforcement?.warningCount > 0 && <span className="badge badge-orange">{user.enforcement.warningCount} warning(s)</span>}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 16 }}>
              <Stat label="Forum posts" value={user._count.forumPosts} />
              <Stat label="Forum replies" value={user._count.forumReplies} />
              <Stat label="Sessions created" value={user._count.sessionsCreated} />
              <Stat label="Sessions joined" value={user._count.sessionParticipants} />
              <Stat label="Challenges" value={user._count.challengesSent + user._count.challengesReceived} />
              <Stat label="DMs sent" value={user._count.dmsSent} />
              <Stat label="Reports against" value={user._count.reportsAgainst} />
              <Stat label="Reports filed" value={user._count.reportsFiled} />
            </div>

            {user.profile && (
              <div style={{ background: 'var(--bg2, #1a1a1a)', padding: 12, borderRadius: 6, marginBottom: 16 }}>
                <h4 style={{ marginBottom: 6 }}>Profile</h4>
                <div className="text-sm" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
                  <span className="text-muted">Skill:</span><span>{user.profile.skillLevel}</span>
                  <span className="text-muted">Handedness:</span><span>{user.profile.handedness}</span>
                  <span className="text-muted">Years playing:</span><span>{user.profile.yearsPlaying ?? '—'}</span>
                  <span className="text-muted">Phone:</span><span>{user.profile.phone || '—'}</span>
                  <span className="text-muted">OK to text:</span><span>{user.profile.okToText ? 'Yes' : 'No'}</span>
                  <span className="text-muted">Looking to play:</span><span>{user.profile.lookingToPlay ? 'Yes' : 'No'}</span>
                  <span className="text-muted">Instructor:</span><span>{user.profile.isInstructor ? `Yes${user.profile.acceptingClients ? ' · accepting clients' : ''}` : 'No'}</span>
                  <span className="text-muted">Bio:</span><span style={{ whiteSpace: 'pre-wrap' }}>{user.profile.bio || '—'}</span>
                </div>
              </div>
            )}

            {user.rating && (
              <div style={{ background: 'var(--bg2, #1a1a1a)', padding: 12, borderRadius: 6, marginBottom: 16 }}>
                <h4 style={{ marginBottom: 6 }}>Rating</h4>
                <div className="text-sm">
                  Elo: <strong>{Math.round(user.rating.elo)}</strong> · {user.rating.matchesPlayed} matches · {user.rating.wins}W / {user.rating.losses}L
                </div>
              </div>
            )}

            {user.forumPosts?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 6 }}>Recent forum posts</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {user.forumPosts.map((p: any) => (
                    <Link key={p.id} to={`/forum/${p.id}`} className="text-sm" style={{ color: 'var(--accent)' }}>
                      {p.subject} <span className="text-muted">· {p._count.replies} replies · {format(new Date(p.createdAt), 'MMM d')}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {user.sessionsCreated?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 6 }}>Recent sessions created</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {user.sessionsCreated.map((s: any) => (
                    <div key={s.id} className="text-sm">
                      {format(new Date(s.startTime), 'MMM d · h:mm a')} · {s.location?.name} · {s.format} · <span className="text-muted">{s.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 flex-wrap" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <Link to={`/profile/${user.id}`} className="btn btn-secondary btn-sm">View Public Profile</Link>
              {!isSelf && (
                <>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                      await api.adminToggleAdmin(user.id)
                      await refresh()
                    }}
                  >
                    {user.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                      const notes = prompt('Warning notes:') || ''
                      await api.adminWarnUser(user.id, notes)
                      await refresh()
                    }}
                  >
                    ⚠️ Warn
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                      const next = !user.enforcement?.suspended
                      await api.adminSuspendUser(user.id, next)
                      await refresh()
                    }}
                  >
                    {user.enforcement?.suspended ? '✓ Unsuspend' : '⛔ Suspend'}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={async () => {
                      const confirmText = prompt(`This will permanently delete ${user.profile?.displayName || user.email} AND all their content (sessions, posts, replies, DMs, etc.). This cannot be undone.\n\nType DELETE to confirm:`)
                      if (confirmText !== 'DELETE') return
                      await api.adminDeleteUser(user.id)
                      onChanged()
                      onClose()
                    }}
                  >
                    🗑 Delete User
                  </button>
                </>
              )}
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: 'var(--bg2, #1a1a1a)', padding: '8px 10px', borderRadius: 6, textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState<'reports' | 'disputes' | 'users'>('reports')
  const [reports, setReports] = useState<any[]>([])
  const [disputes, setDisputes] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userSearchInput, setUserSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [openUserId, setOpenUserId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.adminGetReports(), api.adminGetDisputes()])
      .then(([r, d]) => { setReports(r); setDisputes(d); setLoading(false) })
  }, [])

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const u = await api.adminGetUsers(userSearch || undefined)
      setUsers(u)
    } finally { setUsersLoading(false) }
  }

  useEffect(() => { if (tab === 'users') loadUsers() }, [tab, userSearch])

  const resolveReport = async (id: string, status: string) => {
    await api.adminResolveReport(id, status)
    setReports(r => r.filter(rep => rep.id !== id))
  }

  const resolveDispute = async (id: string, status: string) => {
    await api.adminResolveDispute(id, status)
    setDisputes(d => d.filter(dis => dis.id !== id))
  }

  const warnUser = async (userId: string) => {
    const notes = prompt('Warning notes:') || ''
    await api.adminWarnUser(userId, notes)
    alert('Warning issued.')
  }

  const suspendUser = async (userId: string) => {
    if (!confirm('Suspend this user?')) return
    await api.adminSuspendUser(userId, true)
    alert('User suspended.')
  }

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">ADMIN PANEL</h1>
          <p className="page-subtitle">Moderation tools</p>
        </div>
        <Link to="/admin/articles" className="btn btn-secondary btn-sm">📰 Manage Articles</Link>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
          Reports {reports.length > 0 && `(${reports.length})`}
        </button>
        <button className={`tab ${tab === 'disputes' ? 'active' : ''}`} onClick={() => setTab('disputes')}>
          Disputes {disputes.length > 0 && `(${disputes.length})`}
        </button>
        <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          Users
        </button>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : tab === 'reports' ? (
        reports.length === 0 ? (
          <div className="empty-state"><div className="icon">✅</div><h3>No pending reports</h3></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reports.map(r => (
              <div key={r.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="badge badge-orange">{r.category}</span>
                  <span className="text-xs text-muted">{formatRelative(r.createdAt)}</span>
                </div>
                <div className="text-sm mb-1"><strong>From:</strong> {r.reporter?.profile?.displayName}</div>
                {r.reported?.profile?.displayName && (
                  <div className="text-sm mb-1"><strong>About:</strong> {r.reported.profile.displayName}</div>
                )}
                {r.forumPost && (
                  <div style={{ background: 'var(--gray-50, #fafafa)', borderLeft: '3px solid var(--accent)', padding: 8, marginBottom: 8, borderRadius: 4 }}>
                    <div className="text-xs text-muted">Forum post:</div>
                    <a href={`/forum/${r.forumPost.id}`} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>{r.forumPost.subject}</a>
                    <div className="text-sm" style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{r.forumPost.body}</div>
                  </div>
                )}
                {r.forumReply && (
                  <div style={{ background: 'var(--gray-50, #fafafa)', borderLeft: '3px solid var(--accent)', padding: 8, marginBottom: 8, borderRadius: 4 }}>
                    <div className="text-xs text-muted">
                      Forum reply (<a href={`/forum/${r.forumReply.postId}`} target="_blank" rel="noreferrer">view thread</a>):
                    </div>
                    <div className="text-sm" style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{r.forumReply.body}</div>
                  </div>
                )}
                <p className="text-sm text-muted mb-3">{r.details}</p>
                <div className="flex gap-2 flex-wrap">
                  <button className="btn btn-secondary btn-sm" onClick={() => resolveReport(r.id, 'resolved')}>✓ Resolve</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => resolveReport(r.id, 'dismissed')}>Dismiss</button>
                  {r.reportedUser && <>
                    <button className="btn btn-danger btn-sm" onClick={() => warnUser(r.reportedUser)}>⚠️ Warn User</button>
                    <button className="btn btn-danger btn-sm" onClick={() => suspendUser(r.reportedUser)}>⛔ Suspend</button>
                  </>}
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === 'disputes' ? (
        disputes.length === 0 ? (
          <div className="empty-state"><div className="icon">✅</div><h3>No open disputes</h3></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {disputes.map(d => (
              <div key={d.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="badge badge-red">Dispute</span>
                  <span className="text-xs text-muted">{formatRelative(d.createdAt)}</span>
                </div>
                <div className="text-sm mb-1"><strong>Opened by:</strong> {d.opener?.profile?.displayName}</div>
                <div className="text-sm mb-1"><strong>Reason:</strong> {d.reason}</div>
                <p className="text-sm text-muted mb-3">{d.details}</p>
                <div className="flex gap-2">
                  <button className="btn btn-primary btn-sm" onClick={() => resolveDispute(d.id, 'resolved')}>✓ Resolve & Apply Elo</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => resolveDispute(d.id, 'dismissed')}>Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div>
          <form
            onSubmit={e => { e.preventDefault(); setUserSearch(userSearchInput.trim()) }}
            style={{ display: 'flex', gap: 8, marginBottom: 12 }}
          >
            <input
              value={userSearchInput}
              onChange={e => setUserSearchInput(e.target.value)}
              placeholder="Search by name or email..."
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-secondary btn-sm">Search</button>
            {userSearch && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setUserSearch(''); setUserSearchInput('') }}>Clear</button>
            )}
          </form>

          {usersLoading ? (
            <div className="loading-screen"><div className="spinner" /></div>
          ) : users.length === 0 ? (
            <div className="empty-state"><div className="icon">👥</div><h3>No users match</h3></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {users.map(u => (
                <div
                  key={u.id}
                  className="card"
                  style={{ cursor: 'pointer', padding: 14 }}
                  onClick={() => setOpenUserId(u.id)}
                >
                  <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
                      background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontFamily: 'var(--font-display)', color: 'var(--accent)', flexShrink: 0,
                    }}>
                      {u.profile?.photoUrl
                        ? <img src={u.profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : getInitials(u.profile?.displayName || u.email)
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700 }}>{u.profile?.displayName || '(no name)'}</span>
                        {u.isAdmin && <span className="badge badge-orange" style={{ fontSize: 10 }}>Admin</span>}
                        {u.profile?.isInstructor && <span className="badge" style={{ fontSize: 10 }}>Instructor</span>}
                        {u.enforcement?.suspended && <span className="badge badge-red" style={{ fontSize: 10 }}>Suspended</span>}
                      </div>
                      <div className="text-sm text-muted">{u.email}</div>
                      <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                        Joined {format(new Date(u.createdAt), 'MMM d, yyyy')}
                        {u.lastActive && ` · last active ${formatRelative(u.lastActive)}`}
                      </div>
                      <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                        {u._count.forumPosts} posts · {u._count.forumReplies} replies · {u._count.sessionsCreated} sessions · {u._count.reportsAgainst} reports
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {openUserId && (
        <UserDetailModal
          userId={openUserId}
          onClose={() => setOpenUserId(null)}
          onChanged={() => loadUsers()}
        />
      )}
    </div>
  )
}
