import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useStore } from '../store'
import { Button, Card, Badge, Spinner, EmptyState, Avatar, Modal, Select, Alert } from '../components/ui'
import { PageHeader, PageContainer } from '../components/layout/Layout'

export default function MatchFinderPage() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ lookingToPlay: 'false', minSkill: '', maxSkill: '', search: '' })
  const [inviteModal, setInviteModal] = useState<{ player: any; open: boolean }>({ player: null, open: false })
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (filters.lookingToPlay === 'true') params.lookingToPlay = 'true'
    if (filters.minSkill) params.minSkill = filters.minSkill
    if (filters.maxSkill) params.maxSkill = filters.maxSkill
    if (filters.search) params.search = filters.search
    api.getPlayers(params)
      .then((ps) => setPlayers(ps.filter((p: any) => p.userId !== user?.id)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filters, user?.id])

  useEffect(() => { load() }, [load])

  const openInviteModal = async (player: any) => {
    if (!user) { navigate('/login'); return }
    setInviteModal({ player, open: true })
    setInviteMsg('')
    // Load user's sessions where they're host
    const ss = await api.getSessions()
    setSessions(ss.filter((s: any) => s.createdBy === user.id && s.status === 'open'))
    if (ss.length > 0) setSelectedSession(ss[0].id)
  }

  const handleInvite = async () => {
    if (!selectedSession) return
    setInviting(true)
    try {
      await api.inviteToSession(selectedSession, inviteModal.player.userId)
      setInviteMsg('Invite sent!')
    } catch (err: any) {
      setInviteMsg(err.error || 'Could not send invite.')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="fade-in">
      <PageHeader title="FIND PLAYERS" subtitle="Connect with players looking to hit" />
      <PageContainer style={{ paddingBottom: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search + filters */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search by name..."
              style={{
                flex: 1, minWidth: '160px',
                background: 'var(--surface-2)', border: '1px solid var(--court-line)',
                borderRadius: 'var(--radius)', padding: '10px 14px',
                color: 'var(--text)', fontSize: '15px',
              }}
            />
            <select
              value={filters.lookingToPlay}
              onChange={(e) => setFilters((f) => ({ ...f, lookingToPlay: e.target.value }))}
              style={{ background: 'var(--surface-2)', border: '1px solid var(--court-line)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text)', fontSize: '14px' }}
            >
              <option value="false">All players</option>
              <option value="true">🟢 Available now</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>NTRP:</span>
            {['2.0','2.5','3.0','3.5','4.0','4.5','5.0'].map((v) => (
              <button
                key={v}
                onClick={() => setFilters((f) => ({ ...f, minSkill: f.minSkill === v ? '' : v }))}
                style={{
                  padding: '4px 10px', borderRadius: '100px', border: '1px solid',
                  borderColor: filters.minSkill === v ? 'var(--baseline)' : 'var(--court-line)',
                  background: filters.minSkill === v ? 'var(--baseline-dim)' : 'transparent',
                  color: filters.minSkill === v ? 'var(--baseline)' : 'var(--text-muted)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {v}+
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
              <Spinner size={32} />
            </div>
          ) : players.length === 0 ? (
            <EmptyState icon="👥" title="No players found" subtitle="Try adjusting your filters or check back later." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {players.map((p) => (
                <PlayerCard key={p.userId} player={p} onInvite={() => openInviteModal(p)} />
              ))}
            </div>
          )}
        </div>
      </PageContainer>

      {/* Invite modal */}
      <Modal open={inviteModal.open} onClose={() => { setInviteModal({ player: null, open: false }); setInviteMsg('') }} title="INVITE TO SESSION">
        {inviteModal.player && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Avatar name={inviteModal.player.displayName} size={48} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '18px' }}>{inviteModal.player.displayName}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>NTRP {inviteModal.player.skillLevel}</div>
              </div>
            </div>

            {sessions.length === 0 ? (
              <Alert variant="warn">
                You don't have any open sessions to invite to. <Link to="/sessions/new">Plan a session first.</Link>
              </Alert>
            ) : (
              <>
                <Select
                  label="Choose a session"
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  options={sessions.map((s) => ({
                    value: s.id,
                    label: `${s.location?.name} · ${new Date(s.startTime).toLocaleString()}`,
                  }))}
                />
                {inviteMsg && (
                  <Alert variant={inviteMsg.includes('sent') ? 'success' : 'error'}>{inviteMsg}</Alert>
                )}
                <Button onClick={handleInvite} loading={inviting} fullWidth disabled={!selectedSession || !!inviteMsg}>
                  Send Invite
                </Button>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function PlayerCard({ player, onInvite }: { player: any; onInvite: () => void }) {
  const { user } = useStore()
  return (
    <Card style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
      <Avatar name={player.displayName} photoUrl={player.photoUrl} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '16px' }}>{player.displayName}</strong>
          {player.lookingToPlay && <Badge variant="success">🟢 Looking to play</Badge>}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '2px' }}>
          NTRP {player.skillLevel} · {player.handedness} · Elo {Math.round(player.rating?.elo || 1200)}
        </div>
        {player.bio && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {player.bio}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        {user && <Button size="sm" onClick={onInvite}>Invite</Button>}
        <Link to={`/players/${player.userId}`}>
          <Button size="sm" variant="ghost">Profile</Button>
        </Link>
      </div>
    </Card>
  )
}
