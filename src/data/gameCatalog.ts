import type { Difficulty, GameCategory, GameDefinition } from '@/types';
import { GAME_REGISTRY } from '@/games/registry';
import { PLANNED_GAMES } from './plannedGames';

const implementedIds = new Set(GAME_REGISTRY.map((g) => g.id));

/** A planned entry is superseded as soon as the real game is registered. */
const ALL_GAMES: GameDefinition[] = [
  ...GAME_REGISTRY,
  ...PLANNED_GAMES.filter((g) => !implementedIds.has(g.id)),
];

const byId = new Map(ALL_GAMES.map((g) => [g.id, g]));

if (import.meta.env.DEV && byId.size !== ALL_GAMES.length) {
  console.warn('[catalog] duplicate game ids detected');
}

export function getGames(): GameDefinition[] {
  return ALL_GAMES;
}

export function getPlayableGames(): GameDefinition[] {
  return GAME_REGISTRY;
}

export function getGame(id: string): GameDefinition | undefined {
  return byId.get(id);
}

export function getGamesByCategory(category: GameCategory, playableOnly = false): GameDefinition[] {
  return (playableOnly ? GAME_REGISTRY : ALL_GAMES).filter((g) => g.category === category);
}

export function countByCategory(): Record<string, { total: number; playable: number }> {
  const out: Record<string, { total: number; playable: number }> = {};
  for (const g of ALL_GAMES) {
    const entry = (out[g.category] ??= { total: 0, playable: 0 });
    entry.total += 1;
    if (g.status === 'available') entry.playable += 1;
  }
  return out;
}

export interface GameFilters {
  query?: string;
  categories?: GameCategory[];
  difficulties?: Difficulty[];
  keyboard?: boolean;
  touch?: boolean;
  multiplayer?: boolean;
  singlePlayer?: boolean;
  highScore?: boolean;
  favoritesOnly?: boolean;
  availableOnly?: boolean;
}

export type SortKey =
  | 'alphabetical'
  | 'recent'
  | 'most-played'
  | 'favorites'
  | 'difficulty'
  | 'category';

export interface SortContext {
  favorites: string[];
  recent: Record<string, number>;
  playCounts: Record<string, number>;
}

const DIFFICULTY_ORDER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

/**
 * Client-side search across title, descriptions, tags and category name.
 * Words are matched independently so "cricket bat" finds "Cricket Batting".
 */
function matchesQuery(game: GameDefinition, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    game.title,
    game.shortDescription,
    game.fullDescription,
    game.category,
    ...game.tags,
  ]
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

export function filterGames(
  games: GameDefinition[],
  filters: GameFilters,
  favorites: string[] = [],
): GameDefinition[] {
  return games.filter((game) => {
    if (filters.availableOnly && game.status !== 'available') return false;
    if (filters.query && !matchesQuery(game, filters.query)) return false;
    if (filters.categories?.length && !filters.categories.includes(game.category)) return false;
    if (filters.difficulties?.length && !filters.difficulties.includes(game.difficulty)) return false;
    if (filters.keyboard && !game.supportsKeyboard) return false;
    if (filters.touch && !game.supportsTouch) return false;
    if (filters.multiplayer && game.multiplayer !== 'local-multiplayer') return false;
    if (filters.singlePlayer && game.multiplayer === 'local-multiplayer') return false;
    if (filters.highScore && !game.hasHighScore) return false;
    if (filters.favoritesOnly && !favorites.includes(game.id)) return false;
    return true;
  });
}

export function sortGames(
  games: GameDefinition[],
  key: SortKey,
  ctx: SortContext,
): GameDefinition[] {
  const list = games.slice();
  const alpha = (a: GameDefinition, b: GameDefinition) => a.title.localeCompare(b.title);
  switch (key) {
    case 'recent':
      return list.sort((a, b) => (ctx.recent[b.id] ?? 0) - (ctx.recent[a.id] ?? 0) || alpha(a, b));
    case 'most-played':
      return list.sort(
        (a, b) => (ctx.playCounts[b.id] ?? 0) - (ctx.playCounts[a.id] ?? 0) || alpha(a, b),
      );
    case 'favorites':
      return list.sort((a, b) => {
        const fa = ctx.favorites.includes(a.id) ? 0 : 1;
        const fb = ctx.favorites.includes(b.id) ? 0 : 1;
        return fa - fb || alpha(a, b);
      });
    case 'difficulty':
      return list.sort(
        (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] || alpha(a, b),
      );
    case 'category':
      return list.sort((a, b) => a.category.localeCompare(b.category) || alpha(a, b));
    case 'alphabetical':
    default:
      return list.sort(alpha);
  }
}

/** Simple relevance-ranked search used by the header search box. */
export function searchGames(query: string, limit = 8): GameDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { game: GameDefinition; score: number }[] = [];
  for (const game of ALL_GAMES) {
    if (!matchesQuery(game, q)) continue;
    const title = game.title.toLowerCase();
    let score = 0;
    if (title === q) score += 100;
    else if (title.startsWith(q)) score += 60;
    else if (title.includes(q)) score += 40;
    if (game.tags.some((t) => t.toLowerCase() === q)) score += 30;
    if (game.category.includes(q)) score += 12;
    if (game.status === 'available') score += 25;
    scored.push({ game, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.game.title.localeCompare(b.game.title))
    .slice(0, limit)
    .map((s) => s.game);
}

export function getRelatedGames(game: GameDefinition, limit = 6): GameDefinition[] {
  const explicit = (game.related ?? [])
    .map((id) => byId.get(id))
    .filter((g): g is GameDefinition => !!g && g.status === 'available');
  if (explicit.length >= limit) return explicit.slice(0, limit);

  const tagSet = new Set(game.tags);
  const candidates = GAME_REGISTRY.filter(
    (g) => g.id !== game.id && !explicit.some((e) => e.id === g.id),
  )
    .map((g) => {
      let score = g.category === game.category ? 3 : 0;
      score += g.tags.filter((t) => tagSet.has(t)).length;
      return { g, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((c) => c.g);

  return [...explicit, ...candidates].slice(0, limit);
}

export function getFeaturedGames(limit = 8): GameDefinition[] {
  const featured = GAME_REGISTRY.filter((g) => g.tags.includes('featured'));
  const rest = GAME_REGISTRY.filter((g) => !g.tags.includes('featured'));
  return [...featured, ...rest].slice(0, limit);
}

export function getNewGames(limit = 8): GameDefinition[] {
  return GAME_REGISTRY.slice(-limit).reverse();
}

export const TOTAL_PLANNED = ALL_GAMES.length;
export const TOTAL_PLAYABLE = GAME_REGISTRY.length;
