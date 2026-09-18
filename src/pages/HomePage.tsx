import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/PageMeta';
import { Section } from '@/components/Section';
import { GameCard } from '@/components/GameCard';
import { CATEGORIES } from '@/data/categories';
import {
  TOTAL_PLANNED,
  TOTAL_PLAYABLE,
  countByCategory,
  getFeaturedGames,
  getGame,
  getNewGames,
  getPlayableGames,
} from '@/data/gameCatalog';
import { site } from '@/config/site';
import {
  getAllProgress,
  getAllStats,
  getFavorites,
  getProfile,
  getRecentGames,
  subscribe,
} from '@/storage/StorageService';
import { getCompletionPercent } from '@/achievements/AchievementService';
import { getChallengeState, getTodaysChallenge } from '@/services/dailyChallenge';
import type { GameDefinition, GameProgressRecord } from '@/types';
import { formatNumber, formatRelative } from '@/utils/format';

function useRecentGames(): GameDefinition[] {
  const [ids, setIds] = useState(() => getRecentGames());
  useEffect(() => subscribe('recent', () => setIds(getRecentGames())), []);
  return useMemo(
    () =>
      ids
        .map((e) => getGame(e.gameId))
        .filter((g): g is GameDefinition => !!g && g.status === 'available')
        .slice(0, 12),
    [ids],
  );
}

export default function HomePage() {
  const recent = useRecentGames();
  const featured = useMemo(() => getFeaturedGames(10), []);
  const newest = useMemo(() => getNewGames(6), []);
  const counts = useMemo(() => countByCategory(), []);
  const challenge = useMemo(() => getTodaysChallenge(), []);

  const [favorites, setFavorites] = useState<GameDefinition[]>([]);
  const [progress, setProgress] = useState<GameProgressRecord[]>([]);
  const [popular, setPopular] = useState<GameDefinition[]>([]);
  const [achievementPercent, setAchievementPercent] = useState(0);
  const [profile, setProfile] = useState(() => getProfile());

  useEffect(() => subscribe('profile', () => setProfile(getProfile())), []);

  useEffect(() => {
    const load = () => {
      setFavorites(
        getFavorites()
          .map((id) => getGame(id))
          .filter((g): g is GameDefinition => !!g)
          .slice(0, 6),
      );
      void getAllProgress().then((rows) => setProgress(rows.filter((r) => getGame(r.gameId)).slice(0, 6)));
      void getAllStats().then((rows) => {
        const sorted = rows
          .filter((r) => r.gamesStarted > 0)
          .sort((a, b) => b.gamesStarted - a.gamesStarted)
          .map((r) => getGame(r.gameId))
          .filter((g): g is GameDefinition => !!g && g.status === 'available')
          .slice(0, 6);
        setPopular(sorted);
      });
      void getCompletionPercent().then(setAchievementPercent);
    };
    load();
    return subscribe('*', load);
  }, []);

  const challengeState = challenge ? getChallengeState(challenge) : null;

  return (
    <div className="container stack" style={{ gap: 'var(--space-6)' }}>
      <PageMeta />

      <section className="hero">
        <h1>{site.heroTitle}</h1>
        <p>{site.description}</p>
        <div className="hero-actions">
          <Link className="btn btn-primary btn-lg" to="/games/">
            Browse {TOTAL_PLAYABLE} games
          </Link>
          {recent[0] ? (
            <Link className="btn btn-lg" to={`/games/${recent[0].id}/`}>
              Continue {recent[0].title}
            </Link>
          ) : (
            <Link className="btn btn-lg" to="/categories/">
              Explore categories
            </Link>
          )}
        </div>
      </section>

      {challenge && challengeState && (
        <section className="card" style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontSize: '2rem' }} aria-hidden="true">
            📅
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="row" style={{ gap: 8 }}>
              <h2 style={{ fontSize: '1.05rem' }}>Daily Challenge</h2>
              {challengeState.completed && <span className="badge badge-easy">Completed</span>}
            </div>
            <p className="small muted" style={{ marginTop: 4 }}>
              {challenge.description} Worth {challenge.reward} coins. Stored on this device only.
            </p>
            {!challengeState.completed && challenge.goalType === 'score' && (
              <div style={{ marginTop: 8, maxWidth: 320 }}>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, (challengeState.progress / challenge.target) * 100)}%`,
                    }}
                  />
                </div>
                <div className="tiny faint" style={{ marginTop: 4 }}>
                  Best today: {challengeState.progress} / {challenge.target}
                </div>
              </div>
            )}
          </div>
          <Link className="btn btn-primary" to={`/games/${challenge.gameId}/`}>
            Play {challenge.game.title}
          </Link>
        </section>
      )}

      {progress.length > 0 && (
        <Section title="Continue Playing">
          <div className="game-grid">
            {progress.map((p) => {
              const game = getGame(p.gameId);
              if (!game) return null;
              const label =
                p.label ??
                (p.percent != null
                  ? `${Math.round(p.percent)}% complete`
                  : p.level != null
                    ? `Level ${p.level}`
                    : `Saved ${formatRelative(p.updatedAt)}`);
              return <GameCard key={p.gameId} game={game} subtitle={label} showBest={false} />;
            })}
          </div>
        </Section>
      )}

      {recent.length > 0 && (
        <Section title="Recently Played" moreHref="/games?sort=recent">
          <div className="game-grid">
            {recent.slice(0, 6).map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Featured Games" moreHref="/games">
        {featured.length ? (
          <div className="game-grid">
            {featured.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="emoji">🚧</div>
            <p>No games are registered yet.</p>
          </div>
        )}
      </Section>

      {popular.length > 0 && (
        <Section title="Popular With You" moreHref="/games?sort=most-played">
          <div className="game-grid">
            {popular.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </Section>
      )}

      {favorites.length > 0 && (
        <Section title="Your Favorites" moreHref="/favorites">
          <div className="game-grid">
            {favorites.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </Section>
      )}

      {newest.length > 0 && (
        <Section title="New Games" moreHref="/games">
          <div className="game-grid">
            {newest.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Categories" moreHref="/categories">
        <div className="category-grid">
          {CATEGORIES.map((cat) => (
            <Link key={cat.id} to={`/categories/${cat.slug}/`} className="category-card">
              <span className="category-icon" aria-hidden="true">
                {cat.icon}
              </span>
              <strong>{cat.name}</strong>
              <span className="tiny muted">
                {counts[cat.id]?.playable ?? 0} playable · {counts[cat.id]?.total ?? 0} planned
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Your Progress" moreHref="/statistics" moreLabel="Full statistics">
        <div className="stat-grid">
          <div className="stat">
            <div className="stat-value">{formatNumber(profile.totalGamesPlayed)}</div>
            <div className="stat-label">Games played</div>
          </div>
          <div className="stat">
            <div className="stat-value">{achievementPercent}%</div>
            <div className="stat-label">Achievements unlocked</div>
          </div>
          <div className="stat">
            <div className="stat-value">{formatNumber(profile.totalCoins)}</div>
            <div className="stat-label">Coins earned</div>
          </div>
          <div className="stat">
            <div className="stat-value">
              {getPlayableGames().length}
              <span className="muted" style={{ fontSize: '0.9rem' }}>
                {' '}
                / {TOTAL_PLANNED}
              </span>
            </div>
            <div className="stat-label">Games available</div>
          </div>
        </div>
      </Section>
    </div>
  );
}
