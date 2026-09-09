import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/PageMeta';
import {
  getActivity,
  getAllStats,
  getProfile,
  getScoreHistory,
  subscribe,
} from '@/storage/StorageService';
import { getAchievementState } from '@/achievements/AchievementService';
import { getGame } from '@/data/gameCatalog';
import { categoryName } from '@/data/categories';
import { formatDuration, formatNumber, formatRelative } from '@/utils/format';
import type { ActivityRecord, GameStatistics } from '@/types';

export default function StatisticsPage() {
  const [stats, setStats] = useState<GameStatistics[]>([]);
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [profile, setProfile] = useState(() => getProfile());
  const [achievementsUnlocked, setAchievementsUnlocked] = useState(0);
  const [longestSession, setLongestSession] = useState(0);

  useEffect(() => {
    const load = () => {
      setProfile(getProfile());
      void getAllStats().then(setStats);
      void getActivity(20).then(setActivity);
      void getAchievementState().then((rows) =>
        setAchievementsUnlocked(rows.filter((r) => r.unlocked).length),
      );
      void getScoreHistory().then((rows) =>
        setLongestSession(rows.reduce((max, r) => Math.max(max, r.durationMs), 0)),
      );
    };
    load();
    return subscribe('*', load);
  }, []);

  const played = useMemo(() => stats.filter((s) => s.gamesStarted > 0), [stats]);

  const favoriteGame = useMemo(() => {
    const top = played.slice().sort((a, b) => b.gamesStarted - a.gamesStarted)[0];
    return top ? getGame(top.gameId) : null;
  }, [played]);

  const topScores = useMemo(
    () =>
      played
        .filter((s) => s.highScore !== null)
        .sort((a, b) => (b.highScore ?? 0) - (a.highScore ?? 0))
        .slice(0, 10),
    [played],
  );

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of played) {
      const game = getGame(s.gameId);
      if (!game) continue;
      map[game.category] = (map[game.category] ?? 0) + s.gamesStarted;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [played]);

  const totalCompleted = played.reduce((sum, s) => sum + s.gamesCompleted, 0);
  const maxCategory = byCategory[0]?.[1] ?? 1;

  return (
    <div className="container stack">
      <PageMeta
        title="Statistics"
        description="Your local play statistics: games played, play time, best scores and achievements."
      />
      <div>
        <h1 style={{ fontSize: '1.6rem' }}>Statistics</h1>
        <p className="muted small" style={{ marginTop: 4 }}>
          Everything below is calculated from data stored in this browser.
        </p>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-value">{formatNumber(profile.totalGamesPlayed)}</div>
          <div className="stat-label">Total games played</div>
        </div>
        <div className="stat">
          <div className="stat-value">{formatDuration(profile.totalPlayTime)}</div>
          <div className="stat-label">Total play time</div>
        </div>
        <div className="stat">
          <div className="stat-value">{formatNumber(totalCompleted)}</div>
          <div className="stat-label">Games completed</div>
        </div>
        <div className="stat">
          <div className="stat-value">{formatNumber(achievementsUnlocked)}</div>
          <div className="stat-label">Achievements unlocked</div>
        </div>
        <div className="stat">
          <div className="stat-value">{formatNumber(profile.totalCoins)}</div>
          <div className="stat-label">Coins earned</div>
        </div>
        <div className="stat">
          <div className="stat-value">{formatDuration(longestSession)}</div>
          <div className="stat-label">Longest session</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ fontSize: favoriteGame ? '1.1rem' : undefined }}>
            {favoriteGame ? favoriteGame.title : '—'}
          </div>
          <div className="stat-label">Favorite game</div>
        </div>
        <div className="stat">
          <div className="stat-value">{formatNumber(played.length)}</div>
          <div className="stat-label">Different games tried</div>
        </div>
      </div>

      {byCategory.length > 0 && (
        <section className="card">
          <h2 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-4)' }}>
            Games played by category
          </h2>
          <div className="stack" style={{ gap: 10 }}>
            {byCategory.map(([cat, count]) => (
              <div key={cat}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="small">{categoryName(cat as never)}</span>
                  <span className="small muted">{count}</span>
                </div>
                <div className="progress-track" style={{ height: 6, marginTop: 4 }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${(count / maxCategory) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {topScores.length > 0 && (
        <section className="card">
          <h2 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-3)' }}>
            Highest scoring games
          </h2>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Best</th>
                  <th>Played</th>
                  <th>Won</th>
                  <th>Time</th>
                  <th>Last played</th>
                </tr>
              </thead>
              <tbody>
                {topScores.map((s) => {
                  const game = getGame(s.gameId);
                  return (
                    <tr key={s.gameId}>
                      <td>
                        {game ? (
                          <Link to={`/games/${game.id}`} style={{ color: 'var(--brand)' }}>
                            {game.title}
                          </Link>
                        ) : (
                          s.gameId
                        )}
                      </td>
                      <td className="mono">{formatNumber(s.highScore ?? 0)}</td>
                      <td>{s.gamesStarted}</td>
                      <td>{s.wins}</td>
                      <td>{formatDuration(s.totalPlayTime)}</td>
                      <td className="muted">{formatRelative(s.lastPlayed)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activity.length > 0 && (
        <section className="card">
          <h2 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-3)' }}>Recent activity</h2>
          <div className="stack" style={{ gap: 8 }}>
            {activity.map((a, i) => (
              <div key={a.id ?? i} className="row small" style={{ justifyContent: 'space-between' }}>
                <span>{a.message}</span>
                <span className="faint tiny">{formatRelative(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {played.length === 0 && (
        <div className="empty-state">
          <div className="emoji">📊</div>
          <p>No statistics yet — play a game to start tracking.</p>
          <Link className="btn btn-primary" style={{ marginTop: 16 }} to="/games">
            Browse games
          </Link>
        </div>
      )}
    </div>
  );
}
