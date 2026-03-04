import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Spinner, EmptyState, ErrorMsg } from '../components/ui/helpers';

export default function AdminPanel() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'reports' | 'users'>('reports');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.isAdmin) { navigate('/dashboard'); return; }
    Promise.all([
      api.get<any[]>('/admin/reports'),
      api.get<any[]>('/admin/users'),
    ]).then(([r, u]) => { setReports(r); setUsers(u); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const resolveReport = async (id: string) => {
    await api.post(`/admin/reports/${id}/resolve`, {});
    setReports(rs => rs.filter(r => r.id !== id));
  };

  const warnUser = async (id: string) => {
    const notes = prompt('Warning note:');
    if (!notes) return;
    await api.post(`/admin/users/${id}/warn`, { notes });
    alert('Warning issued.');
  };

  const cooldownUser = async (id: string) => {
    const hours = prompt('Cooldown hours:', '24');
    if (!hours) return;
    await api.post(`/admin/users/${id}/cooldown`, { hours: parseInt(hours), notes: 'Admin cooldown' });
    alert('Cooldown applied.');
  };

  const suspendUser = async (id: string) => {
    const notes = prompt('Suspension reason:');
    if (!notes) return;
    await api.post(`/admin/users/${id}/suspend`, { notes });
    alert('User suspended.');
  };

  const unsuspendUser = async (id: string) => {
    await api.post(`/admin/users/${id}/unsuspend`, {});
    alert('User unsuspended.');
  };

  if (!user?.isAdmin) return null;

  return (
    <div className="page">
      <div className="container">
        <div className="section-header">
          <h1 className="display" style={{ fontSize: '2rem' }}>🛡️ ADMIN PANEL</h1>
        </div>

        <ErrorMsg error={error} />

        <div className="tabs">
          <button className={`tab-btn ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
            🚩 Reports ({reports.length})
          </button>
          <button className={`tab-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
            👥 Users ({users.length})
          </button>
        </div>

        {loading ? <Spinner /> : (
          <>
            {tab === 'reports' && (
              reports.length === 0 ? <EmptyState emoji="✅" title="No open reports" /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {reports.map(r => (
                    <div key={r.id} className="card card-body">
                      <div className="flex items-center justify-between mb-2">
                        <span className="badge badge-red">{r.category}</span>
                        <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm mb-2">{r.details}</p>
                      <div className="text-xs text-muted mb-2">
                        Reporter: {r.reporter?.profile?.displayName || 'Unknown'}
                        {r.reportedUserRel && ` → Against: ${r.reportedUserRel?.profile?.displayName}`}
                      </div>
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-primary" onClick={() => resolveReport(r.id)}>✅ Resolve</button>
                        {r.reportedUser && <>
                          <button className="btn btn-sm btn-yellow" onClick={() => warnUser(r.reportedUser)}>⚠️ Warn User</button>
                          <button className="btn btn-sm btn-danger" onClick={() => suspendUser(r.reportedUser)}>🚫 Suspend</button>
                        </>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === 'users' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--gray-200)', textAlign: 'left' }}>
                      {['Name', 'Email', 'NTRP', 'ELO', 'Matches', 'Warnings', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--gray-600)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{u.profile?.displayName || '–'}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--gray-600)' }}>{u.email}</td>
                        <td style={{ padding: '8px 10px' }}>{u.profile?.skillLevel || '–'}</td>
                        <td style={{ padding: '8px 10px' }}>{u.rating ? Math.round(u.rating.elo) : 1200}</td>
                        <td style={{ padding: '8px 10px' }}>{u.rating?.matchesPlayed || 0}</td>
                        <td style={{ padding: '8px 10px' }}>{u.enforcement?.warningCount || 0}</td>
                        <td style={{ padding: '8px 10px' }}>
                          {u.enforcement?.suspended ? <span className="badge badge-red">Suspended</span> :
                           u.enforcement?.cooldownUntil && new Date(u.enforcement.cooldownUntil) > new Date() ? <span className="badge badge-yellow">Cooldown</span> :
                           <span className="badge badge-green">Active</span>}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div className="flex gap-1">
                            <button className="btn btn-sm btn-yellow" onClick={() => warnUser(u.id)} title="Warn">⚠️</button>
                            <button className="btn btn-sm btn-ghost" onClick={() => cooldownUser(u.id)} title="Cooldown">⏳</button>
                            {u.enforcement?.suspended ? (
                              <button className="btn btn-sm btn-primary" onClick={() => unsuspendUser(u.id)} title="Unsuspend">✅</button>
                            ) : (
                              <button className="btn btn-sm btn-danger" onClick={() => suspendUser(u.id)} title="Suspend">🚫</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
