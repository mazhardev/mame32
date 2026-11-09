import type { Difficulty, GameCategory, GameDefinition } from '@/types';
import { GAME_REGISTRY } from '@/games/registry';
import { PLANNED_GAMES } from './plannedGames';
import { getCategory } from './categories';
import { MIN_HUB_SIZE, topicsForGame } from './topicIndex';
import { SMALL_TOPICS } from './smallTopics';

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

/** Each playable game should be linked from at least this many other game pages. */
export const MIN_INBOUND_RELATED = 4;
/** Slots on a game page filled from its own hub and category; the rest come from other categories. */
const INSIDE_SLOTS = 4;
const RELATED_SLOTS = 6;

/** Small stable hash, so ties never fall back to catalog order. */
function stableHash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function sharedTags(a: GameDefinition, b: GameDefinition): number {
  return a.tags.filter((t) => b.tags.includes(t)).length;
}

let relatedIndex: Map<string, GameDefinition[]> | undefined;

/**
 * Related games for every playable game, built once for the whole catalog.
 *
 * Each page gets its hand-picked games first (and the other games of a small
 * topic, see smallTopics.ts), then up to four from its own
 * topic hub and category, then two from other categories that share tags or
 * sit in a related category. Picks are spread out: a game that is already
 * linked from many pages loses ties to one that is linked from few, and a
 * last pass gives every game at least MIN_INBOUND_RELATED inbound links.
 */
function buildRelatedIndex(): Map<string, GameDefinition[]> {
  const games = [...GAME_REGISTRY.filter((g) => g.status === 'available')].sort((a, b) => a.id.localeCompare(b.id));
  const playable = new Set(games.map((g) => g.id));
  const hubsList = new Map(games.map((g) => [g.id, topicsForGame(g.id, MIN_HUB_SIZE, (id) => playable.has(id))]));
  const hubOf = new Map(games.map((g) => [g.id, hubsList.get(g.id)?.[0]?.slug]));
  const hubsOf = new Map(games.map((g) => [g.id, new Set((hubsList.get(g.id) ?? []).map((t) => t.slug))]));
  const inbound = new Map(games.map((g) => [g.id, 0]));
  const picks = new Map<string, GameDefinition[]>();
  const explicitOf = new Map<string, Set<string>>();

  const sameHub = (a: GameDefinition, b: GameDefinition) =>
    [...(hubsOf.get(a.id) ?? [])].some((slug) => hubsOf.get(b.id)?.has(slug));
  const inside = (g: GameDefinition, o: GameDefinition) =>
    (hubOf.get(g.id) && hubOf.get(g.id) === hubOf.get(o.id) ? 100 : sameHub(g, o) ? 60 : 0) +
    (o.category === g.category ? 30 : 0) +
    4 * Math.min(sharedTags(g, o), 4);
  const outside = (g: GameDefinition, o: GameDefinition) =>
    (sameHub(g, o) ? 60 : 0) +
    6 * Math.min(sharedTags(g, o), 4) +
    (getCategory(g.category).related.includes(o.category) ? 6 : 0);
  const rank = (g: GameDefinition, list: GameDefinition[], score: (o: GameDefinition) => number) =>
    list
      .map((o) => ({ o, v: score(o) - 3 * (inbound.get(o.id) ?? 0), h: stableHash(`${g.id}>${o.id}`) }))
      .sort((a, b) => b.v - a.v || a.h - b.h)
      .map((x) => x.o);

  for (const g of games) {
    const chosen: GameDefinition[] = [];
    const take = (o: GameDefinition) => {
      chosen.push(o);
      inbound.set(o.id, (inbound.get(o.id) ?? 0) + 1);
    };
    const topicMates = SMALL_TOPICS.filter((t) => t.ids.includes(g.id)).flatMap((t) => t.ids);
    for (const id of [...(g.related ?? []), ...topicMates]) {
      const o = byId.get(id);
      if (o && o.status === 'available' && o.id !== g.id && !chosen.includes(o)) take(o);
    }
    explicitOf.set(g.id, new Set(chosen.map((o) => o.id)));
    const near = games.filter((o) => o.id !== g.id && !chosen.includes(o) && inside(g, o) >= 30);
    for (const o of rank(g, near, (x) => inside(g, x))) {
      if (chosen.length >= INSIDE_SLOTS) break;
      take(o);
    }
    const far = games.filter((o) => o.category !== g.category && !chosen.includes(o));
    for (const o of rank(g, far, (x) => outside(g, x))) {
      if (chosen.length >= RELATED_SLOTS) break;
      take(o);
    }
    picks.set(g.id, chosen);
  }

  // Repair: swap a link to an over-linked game for one to an under-linked game.
  for (const x of [...games].sort((a, b) => (inbound.get(a.id) ?? 0) - (inbound.get(b.id) ?? 0))) {
    const hosts = games
      .filter((y) => y.id !== x.id && !(picks.get(y.id) ?? []).includes(x))
      .sort((a, b) => inside(b, x) - inside(a, x) || stableHash(`${x.id}<${a.id}`) - stableHash(`${x.id}<${b.id}`));
    for (const y of hosts) {
      if ((inbound.get(x.id) ?? 0) >= MIN_INBOUND_RELATED) break;
      const list = picks.get(y.id) ?? [];
      const fixed = explicitOf.get(y.id) ?? new Set();
      let slot = -1;
      for (let i = 0; i < list.length; i++) {
        const n = inbound.get(list[i].id) ?? 0;
        if (fixed.has(list[i].id) || n <= MIN_INBOUND_RELATED) continue;
        if (slot < 0 || n > (inbound.get(list[slot].id) ?? 0)) slot = i;
      }
      if (slot < 0) continue;
      inbound.set(list[slot].id, (inbound.get(list[slot].id) ?? 0) - 1);
      list[slot] = x;
      inbound.set(x.id, (inbound.get(x.id) ?? 0) + 1);
    }
  }
  return picks;
}

/** Games that link to each game from their "Related games" section, by id. */
export function relatedInboundCounts(): Map<string, number> {
  relatedIndex ??= buildRelatedIndex();
  const counts = new Map<string, number>();
  for (const list of relatedIndex.values()) for (const g of list) counts.set(g.id, (counts.get(g.id) ?? 0) + 1);
  return counts;
}

export function getRelatedGames(game: GameDefinition, limit = RELATED_SLOTS): GameDefinition[] {
  relatedIndex ??= buildRelatedIndex();
  const indexed = relatedIndex.get(game.id);
  if (indexed) return indexed.slice(0, limit);

  // A planned game (not in the index): same category and shared tags.
  const tagSet = new Set(game.tags);
  return GAME_REGISTRY.filter((g) => g.id !== game.id && g.status === 'available')
    .map((g) => ({ g, score: (g.category === game.category ? 3 : 0) + g.tags.filter((t) => tagSet.has(t)).length }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || stableHash(`${game.id}>${a.g.id}`) - stableHash(`${game.id}>${b.g.id}`))
    .slice(0, limit)
    .map((c) => c.g);
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
