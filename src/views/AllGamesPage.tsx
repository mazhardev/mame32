'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GameCard } from '@/components/GameCard';
import { CATEGORIES } from '@/data/categories';
import { filterGames, getGames, sortGames } from '@/data/gameCatalog';
import type { GameFilters, SortKey } from '@/data/gameCatalog';
import { getAllStats, getFavorites, getRecentGames, subscribe } from '@/storage/StorageService';
import type { Difficulty, GameCategory } from '@/types';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'alphabetical', label: 'A–Z' },
  { key: 'recent', label: 'Recently played' },
  { key: 'most-played', label: 'Most played' },
  { key: 'favorites', label: 'Favorites first' },
  { key: 'difficulty', label: 'Difficulty' },
  { key: 'category', label: 'Category' },
];

type ToggleKey = 'keyboard' | 'touch' | 'multiplayer' | 'singlePlayer' | 'highScore' | 'favoritesOnly';

const TOGGLES: { key: ToggleKey; label: string }[] = [
  { key: 'keyboard', label: 'Keyboard' },
  { key: 'touch', label: 'Touch' },
  { key: 'singlePlayer', label: 'Single player' },
  { key: 'multiplayer', label: 'Local multiplayer' },
  { key: 'highScore', label: 'High scores' },
  { key: 'favoritesOnly', label: 'Favorites' },
];

/**
 * Reports the URL's query string. Kept in its own Suspense boundary so the
 * rest of the page still renders into the static HTML: during the static
 * export only this empty component waits for the browser.
 */
function SearchParamsListener({ onChange }: { onChange: (params: URLSearchParams) => void }) {
  const params = useSearchParams();
  const key = params.toString();
  useEffect(() => {
    onChange(new URLSearchParams(key));
  }, [key, onChange]);
  return null;
}

export default function AllGamesPage() {
  // The static HTML lists every game; ?q, ?category and ?sort apply after load.
  const [urlReady, setUrlReady] = useState(false);
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    keyboard: false,
    touch: false,
    multiplayer: false,
    singlePlayer: false,
    highScore: false,
    favoritesOnly: false,
  });
  const [availableOnly, setAvailableOnly] = useState(true);
  const [sort, setSort] = useState<SortKey>('alphabetical');

  const [favorites, setFavorites] = useState<string[]>([]);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    setFavorites(getFavorites());
    return subscribe('favorites', () => setFavorites(getFavorites()));
  }, []);

  const applyParams = useCallback((params: URLSearchParams) => {
    const q = params.get('q') ?? '';
    setQuery((prev) => (prev === q ? prev : q));
    const c = params.get('category');
    const cats = c ? (c.split(',') as GameCategory[]) : [];
    setCategories((prev) => (prev.join(',') === cats.join(',') ? prev : cats));
    setSort((params.get('sort') as SortKey | null) ?? 'alphabetical');
    setUrlReady(true);
  }, []);

  useEffect(() => {
    void getAllStats().then((rows) => {
      const map: Record<string, number> = {};
      for (const r of rows) map[r.gameId] = r.gamesStarted;
      setPlayCounts(map);
    });
  }, []);

  useEffect(() => {
    if (!urlReady) return;
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (categories.length) next.set('category', categories.join(','));
    if (sort !== 'alphabetical') next.set('sort', sort);
    const search = next.toString();
    if (search !== window.location.search.replace(/^\?/, '')) {
      window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}`);
    }
  }, [urlReady, query, categories, sort]);

  const [recentMap, setRecentMap] = useState<Record<string, number>>({});
  useEffect(() => {
    const map: Record<string, number> = {};
    for (const r of getRecentGames()) map[r.gameId] = r.playedAt;
    setRecentMap(map);
  }, []);

  const filters: GameFilters = useMemo(
    () => ({
      query,
      categories,
      difficulties,
      availableOnly,
      ...toggles,
    }),
    [query, categories, difficulties, availableOnly, toggles],
  );

  const games = useMemo(() => {
    const filtered = filterGames(getGames(), filters, favorites);
    return sortGames(filtered, sort, { favorites, recent: recentMap, playCounts });
  }, [filters, favorites, sort, recentMap, playCounts]);

  const toggleCategory = (id: GameCategory) =>
    setCategories((list) => (list.includes(id) ? list.filter((c) => c !== id) : [...list, id]));

  const toggleDifficulty = (d: Difficulty) =>
    setDifficulties((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d]));

  const activeFilterCount =
    categories.length +
    difficulties.length +
    Object.values(toggles).filter(Boolean).length +
    (availableOnly ? 0 : 1);

  const reset = () => {
    setQuery('');
    setCategories([]);
    setDifficulties([]);
    setToggles({
      keyboard: false,
      touch: false,
      multiplayer: false,
      singlePlayer: false,
      highScore: false,
      favoritesOnly: false,
    });
    setAvailableOnly(true);
  };

  return (
    <div className="container stack">
      <Suspense fallback={null}>
        <SearchParamsListener onChange={applyParams} />
      </Suspense>

      <div>
        <h1 style={{ fontSize: '1.6rem' }}>All Games</h1>
        <p className="muted small" style={{ marginTop: 4 }}>
          {games.length} game{games.length === 1 ? '' : 's'} shown
          {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active` : ''}
        </p>
      </div>

      <div className="card card-tight stack" style={{ gap: 'var(--space-3)' }}>
        <div className="row wrap" style={{ gap: 'var(--space-3)' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <span className="search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              className="input input-search"
              type="search"
              value={query}
              placeholder="Search by name, tag or category…"
              aria-label="Filter games"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <label className="row" style={{ gap: 8 }}>
            <span className="small muted">Sort</span>
            <select
              className="select"
              style={{ width: 'auto' }}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort games"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="chip-row">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`chip${categories.includes(cat.id) ? ' selected' : ''}`}
              onClick={() => toggleCategory(cat.id)}
              aria-pressed={categories.includes(cat.id)}
            >
              <span aria-hidden="true">{cat.icon}</span> {cat.name}
            </button>
          ))}
        </div>

        <div className="chip-row">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              className={`chip${difficulties.includes(d) ? ' selected' : ''}`}
              onClick={() => toggleDifficulty(d)}
              aria-pressed={difficulties.includes(d)}
            >
              {d}
            </button>
          ))}
          {TOGGLES.map((t) => (
            <button
              key={t.key}
              className={`chip${toggles[t.key] ? ' selected' : ''}`}
              onClick={() => setToggles((v) => ({ ...v, [t.key]: !v[t.key] }))}
              aria-pressed={toggles[t.key]}
            >
              {t.label}
            </button>
          ))}
          <button
            className={`chip${availableOnly ? ' selected' : ''}`}
            onClick={() => setAvailableOnly((v) => !v)}
            aria-pressed={availableOnly}
          >
            Playable only
          </button>
          {activeFilterCount > 0 && (
            <button className="chip" onClick={reset}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {games.length ? (
        <div className="game-grid">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="emoji">🔍</div>
          <p>No games match your filters.</p>
          <button className="btn" style={{ marginTop: 12 }} onClick={reset}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
