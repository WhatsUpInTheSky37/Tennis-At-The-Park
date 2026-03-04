import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { formatRelative } from '../lib/utils'

export default function Admin() {
  const [tab, setTab] = useState<'reports' | 'disputes'>('reports')
  const [reports, setReports] = useState<any[]>([])
  const [disputes, setDisputes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.adminGetReports(), api.adminGetDisputes()])
      .then(([r, d]) => { setReports(r); setDisputes(d); setLoading(false) })
  }, [])

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
      <div className="page-header">
        <h1 className="page-title">ADMIN PANEL</h1>
        <p className="page-subtitle">Moderation tools</p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
          Reports {reports.length > 0 && `(${reports.length})`}
        </button>
        <button className={`tab ${tab === 'disputes' ? 'active' : ''}`} onClick={() => setTab('disputes')}>
          Disputes {disputes.length > 0 && `(${disputes.length})`}
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
      ) : (
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
      )}
    </div>
  )
}
