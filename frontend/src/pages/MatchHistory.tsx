import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Match } from '../types';
import { Spinner, EmptyState, CourtInfo, StatusBadge, ErrorMsg } from '../components/ui/helpers';
import { format } from 'date-fns';

function ScoreDisplay({ match, userId }: { match: Match; userId: string }) {
  const sets = match.scoreJson.sets;
  const isTeam1 = match.teamsJson.team1.includes(userId);
  const won = match.winnerUserIds.includes(userId);
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className={`badge ${won ? 'badge-green' : 'badge-red'}`}>{won ? 'W' : 'L'}</span>
        <div className="score-display">
          {sets.map((s, i) => {
            const myScore = isTeam1 ? s.team1 : s.team2;
            const oppScore = isTeam1 ? s.team2 : s.team1;
            const won = myScore > oppScore;
            return <span key={i} className={`score-set ${won ? 'winner' : ''}`}>{myScore}-{oppScore}</span>;
          })}
        </div>
      </div>
      {match.retiredFlag && <span className="badge badge-yellow">Retirement</span>}
      {match.timeRanOutFlag && <span className="badge badge-gray">Time ran out</span>}
    </div>
  );
}

export default function MatchHistory() {
  const { user } = useAuthStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [disputing, setDisputing] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Match[]>(`/matches?userId=${user?.id}`)
      .then(setMatches)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const confirm = async (matchId: string) => {
    try {
      await api.post(`/matches/${matchId}/confirm`, {});
      setMatches(ms => ms.map(m => m.id === matchId ? { ...m, status: 'confirmed' } : m));
    } catch (err: any) { setError(err.message); }
  };

  const dispute = async (matchId: string) => {
    try {
      await api.post(`/matches/${matchId}/dispute`, { reason: disputeReason, details: disputeDetails });
      setMatches(ms => ms.map(m => m.id === matchId ? { ...m, status: 'disputed' } : m));
      setDisputing(null);
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="section-header">
          <h1 className="display" style={{ fontSize: '2rem' }}>MATCH HISTORY</h1>
        </div>

        <ErrorMsg error={error} />

        {loading ? <Spinner /> : matches.length === 0 ? (
          <EmptyState emoji="🎾" title="No matches yet" subtitle="Record your first match to start tracking your Elo!"
            action={<a href="/record" className="btn btn-primary">Record a Match</a>} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {matches.map(m => (
              <div key={m.id} className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted">{format(new Date(m.playedAt), 'EEE, MMM d, yyyy · h:mm a')}</span>
                    <StatusBadge status={m.status} />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{m.location.name}</span>
                    {m.courtNumber && <span className="text-sm text-muted">Court {m.courtNumber}</span>}
                    <span className="badge badge-gray">{m.format}</span>
                  </div>
                  <ScoreDisplay match={m} userId={user?.id || ''} />
                  {m.notes && <p className="text-sm text-muted mt-2" style={{ fontStyle: 'italic' }}>{m.notes}</p>}

                  {m.status === 'pending_confirmation' && m.submittedBy !== user?.id && (
                    <div className="flex gap-2 mt-3">
                      <button className="btn btn-sm btn-primary" onClick={() => confirm(m.id)}>✅ Confirm Result</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDisputing(m.id)}>⚠️ Dispute</button>
                    </div>
                  )}

                  {disputing === m.id && (
                    <div style={{ marginTop: 12, padding: 12, background: 'var(--red-light)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input className="form-input" placeholder="Reason (brief)" value={disputeReason} onChange={e => setDisputeReason(e.target.value)} />
                      <textarea className="form-textarea" placeholder="Details – be factual and specific" value={disputeDetails} onChange={e => setDisputeDetails(e.target.value)} />
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-danger" onClick={() => dispute(m.id)} disabled={!disputeReason || !disputeDetails}>Submit Dispute</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => setDisputing(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
