import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { LeaderboardEntry } from '../types';
import { Spinner, Avatar, EloDisplay } from '../components/ui/helpers';

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'elo' | 'wins_month'>('elo');

  useEffect(() => {
    setLoading(true);
    api.get<LeaderboardEntry[]>(`/leaderboards?type=${type}&limit=25`)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [type]);

  const rankClass = (rank: number) => rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 700 }}>
        <div className="section-header">
          <h1 className="display" style={{ fontSize: '2rem' }}>🏆 LEADERBOARD</h1>
        </div>

        <div className="tabs">
          <button className={`tab-btn ${type === 'elo' ? 'active' : ''}`} onClick={() => setType('elo')}>
            ⚡ Elo Ranking
          </button>
          <button className={`tab-btn ${type === 'wins_month' ? 'active' : ''}`} onClick={() => setType('wins_month')}>
            📅 Wins
          </button>
        </div>

        {loading ? <Spinner /> : (
          <div className="card">
            {entries.map((entry, i) => (
              <div key={entry.userId} style={{ padding: '14px 16px', borderBottom: i < entries.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                <div className="flex items-center gap-3">
                  <div className={`rank-num ${rankClass(entry.rank)}`}>{entry.rank}</div>
                  <Avatar name={entry.displayName} url={entry.photoUrl} size="md" />
                  <Link to={`/profile/${entry.userId}`} style={{ flex: 1, textDecoration: 'none', color: 'inherit' }}>
                    <div className="font-semibold">{entry.displayName}</div>
                    <div className="text-xs text-muted">
                      {entry.matchesPlayed} matches · {entry.wins}W {entry.losses}L
                      {entry.skillLevel && ` · NTRP ${entry.skillLevel}`}
                    </div>
                  </Link>
                  <div style={{ textAlign: 'right' }}>
                    {type === 'elo' ? (
                      <EloDisplay elo={entry.elo} />
                    ) : (
                      <div>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--green-700)' }}>
                          {entry.wins}
                        </span>
                        <span className="text-xs text-muted"> wins</span>
                      </div>
                    )}
                    {entry.rank <= 3 && (
                      <div style={{ fontSize: '1.2rem', marginTop: 2 }}>
                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="alert alert-info mt-4">
          <span className="text-sm">ℹ️ Elo ratings use K-factor 40 (&lt;10 matches), 24 (10–30), 16 (&gt;30). Starting Elo: 1200. Updates apply after match confirmation.</span>
        </div>
      </div>
    </div>
  );
}
