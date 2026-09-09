import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageMeta } from '@/components/PageMeta';
import { GameShell } from '@/components/game/GameShell';
import { GameCard } from '@/components/GameCard';
import { getGame, getRelatedGames } from '@/data/gameCatalog';
import { categoryName } from '@/data/categories';
import {
  clearProgress,
  getProgressRecord,
  getStats,
  isFavorite,
  subscribe,
  toggleFavorite,
} from '@/storage/StorageService';
import { getAchievementState } from '@/achievements/AchievementService';
import type { AchievementRecord, GameProgressRecord, GameStatistics } from '@/types';
import { formatDuration, formatNumber, formatRelative } from '@/utils/format';

export default function GameDetailPage() {
  const { gameId = '' } = useParams();
  const game = getGame(gameId);
  const [stats, setStats] = useState<GameStatistics | null>(null);
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [progress, setProgress] = useState<GameProgressRecord | null>(null);
  const [fav, setFav] = useState(() => isFavorite(gameId));

  const related = useMemo(() => (game ? getRelatedGames(game, 6) : []), [game]);

  useEffect(() => {
    if (!game) return;
    const load = () => {
      void getStats(game.id).then(setStats);
      void getAchievementState().then((rows) =>
        setAchievements(rows.filter((r) => r.gameId === game.id)),
      );
      void getProgressRecord(game.id).then(setProgress);
      setFav(isFavorite(game.id));
    };
    load();
    return subscribe('*', load);
  }, [game]);

  if (!game) {
    return (
      <div className="container">
        <PageMeta title="Game not found" />
        <div className="empty-state">
          <div className="emoji">🎮</div>
          <p>That game does not exist.</p>
          <Link className="btn btn-primary" style={{ marginTop: 16 }} to="/games">
            Browse games
          </Link>
        </div>
      </div>
    );
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="container stack">
      <PageMeta
        title={game.title}
        description={`${game.shortDescription} Play ${game.title} free in your browser — no download, no account.`}
      />

      <nav className="small muted" aria-label="Breadcrumb">
        <Link to="/games">Games</Link> ·{' '}
        <Link to={`/categories/${game.category}`}>{categoryName(game.category)}</Link> ·{' '}
        <span>{game.title}</span>
      </nav>

      <div className="detail-layout">
        <div className="stack">
          {game.status === 'available' ? (
            <GameShell game={game} />
          ) : (
            <div className="empty-state">
              <div className="emoji">🚧</div>
              <h2 style={{ fontSize: '1.2rem' }}>{game.title} is planned</h2>
              <p className="small" style={{ marginTop: 8 }}>
                This game is in the catalog roadmap but is not playable yet. It is listed so you can
                see everything that is coming.
              </p>
              <Link className="btn btn-primary" style={{ marginTop: 16 }} to="/games">
                Play something else
              </Link>
            </div>
          )}

          <section className="card" id="instructions">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: '1.15rem' }}>How to Play</h2>
              <button
                className={`btn btn-sm${fav ? ' btn-primary' : ''}`}
                onClick={() => setFav(toggleFavorite(game.id))}
                aria-pressed={fav}
              >
                {fav ? '♥ Favorited' : '♡ Add to favorites'}
              </button>
            </div>

            <p className="muted small">{game.fullDescription}</p>

            <hr className="divider" />

            <h3 style={{ fontSize: '0.95rem', marginBottom: 8 }}>Objective</h3>
            <p className="small muted">{game.instructions.objective}</p>

            <h3 style={{ fontSize: '0.95rem', margin: '16px 0 8px' }}>Steps</h3>
            <ul className="instructions-list">
              {game.instructions.howToPlay.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>

            {game.instructions.scoring && (
              <>
                <h3 style={{ fontSize: '0.95rem', margin: '16px 0 8px' }}>Scoring</h3>
                <p className="small muted">{game.instructions.scoring}</p>
              </>
            )}

            {game.instructions.difficultyNotes && (
              <>
                <h3 style={{ fontSize: '0.95rem', margin: '16px 0 8px' }}>Difficulty</h3>
                <p className="small muted">{game.instructions.difficultyNotes}</p>
              </>
            )}

            {game.instructions.tips && game.instructions.tips.length > 0 && (
              <>
                <h3 style={{ fontSize: '0.95rem', margin: '16px 0 8px' }}>Tips</h3>
                <ul className="instructions-list">
                  {game.instructions.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        <aside className="stack" style={{ gap: 'var(--space-4)' }}>
          <section className="card card-tight">
            <h2 style={{ fontSize: '1rem', marginBottom: 10 }}>Controls</h2>
            {game.controls.keyboard && game.controls.keyboard.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div className="tiny faint" style={{ marginBottom: 5 }}>
                  KEYBOARD
                </div>
                <ul className="instructions-list">
                  {game.controls.keyboard.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {game.controls.mouse && game.controls.mouse.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div className="tiny faint" style={{ marginBottom: 5 }}>
                  MOUSE
                </div>
                <ul className="instructions-list">
                  {game.controls.mouse.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {game.controls.touch && game.controls.touch.length > 0 && (
              <div>
                <div className="tiny faint" style={{ marginBottom: 5 }}>
                  TOUCH
                </div>
                <ul className="instructions-list">
                  {game.controls.touch.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            <hr className="divider" />
            <div className="row wrap" style={{ gap: 6 }}>
              <span className={`badge badge-${game.difficulty}`}>{game.difficulty}</span>
              <span className="badge">{categoryName(game.category)}</span>
              <span className="badge">~{game.estimatedMinutes} min</span>
              {game.multiplayer === 'local-multiplayer' && <span className="badge">2 players</span>}
              {game.multiplayer === 'vs-ai' && <span className="badge">vs computer</span>}
              {game.supportsTouch && <span className="badge">Touch</span>}
              {game.supportsKeyboard && <span className="badge">Keyboard</span>}
            </div>
          </section>

          {progress && (
            <section className="card card-tight">
              <h2 style={{ fontSize: '1rem', marginBottom: 8 }}>Saved progress</h2>
              <p className="small muted">
                {progress.label ??
                  (progress.percent != null
                    ? `${Math.round(progress.percent)}% complete`
                    : progress.level != null
                      ? `Level ${progress.level}`
                      : 'Saved game available')}
              </p>
              <p className="tiny faint" style={{ marginTop: 4 }}>
                Updated {formatRelative(progress.updatedAt)}
              </p>
              <button
                className="btn btn-danger btn-sm"
                style={{ marginTop: 10 }}
                onClick={() => {
                  if (window.confirm('Delete the saved progress for this game?')) {
                    void clearProgress(game.id);
                  }
                }}
              >
                Delete save
              </button>
            </section>
          )}

          {stats && stats.gamesStarted > 0 && (
            <section className="card card-tight">
              <h2 style={{ fontSize: '1rem', marginBottom: 10 }}>Your statistics</h2>
              <div className="stack" style={{ gap: 6 }}>
                {stats.highScore !== null && (
                  <div className="result-row">
                    <span>Personal best</span>
                    <strong>{formatNumber(stats.highScore)}</strong>
                  </div>
                )}
                <div className="result-row">
                  <span>Games played</span>
                  <strong>{stats.gamesStarted}</strong>
                </div>
                {stats.wins + stats.losses + stats.draws > 0 && (
                  <div className="result-row">
                    <span>W / L / D</span>
                    <strong>
                      {stats.wins} / {stats.losses} / {stats.draws}
                    </strong>
                  </div>
                )}
                {stats.bestWinStreak > 0 && (
                  <div className="result-row">
                    <span>Best win streak</span>
                    <strong>{stats.bestWinStreak}</strong>
                  </div>
                )}
                <div className="result-row">
                  <span>Time played</span>
                  <strong>{formatDuration(stats.totalPlayTime)}</strong>
                </div>
                <div className="result-row">
                  <span>Last played</span>
                  <strong>{formatRelative(stats.lastPlayed)}</strong>
                </div>
              </div>
            </section>
          )}

          {achievements.length > 0 && (
            <section className="card card-tight">
              <h2 style={{ fontSize: '1rem', marginBottom: 10 }}>
                Achievements ({unlockedCount}/{achievements.length})
              </h2>
              <div className="stack" style={{ gap: 8 }}>
                {achievements.map((a) => {
                  const def = game.achievements?.find((d) => d.id === a.achievementId);
                  if (!def) return null;
                  return (
                    <div
                      key={a.achievementId}
                      className="row"
                      style={{ gap: 10, opacity: a.unlocked ? 1 : 0.55 }}
                    >
                      <span style={{ fontSize: '1.1rem' }} aria-hidden="true">
                        {a.unlocked ? (def.icon ?? '🏆') : '🔒'}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 550 }}>
                          {def.name}
                        </span>
                        <span className="tiny muted">{def.description}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section>
          <div className="section-head">
            <h2>Related games</h2>
          </div>
          <div className="game-grid">
            {related.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
