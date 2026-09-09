import type { AchievementDefinition, AchievementRecord, GameCategory } from '@/types';
import {
  addCoins,
  getAchievementRecords,
  getAllStats,
  getFavorites,
  getProfile,
  getAllHighScores,
  logActivity,
  putAchievementRecord,
} from '@/storage/StorageService';
import { GLOBAL_ACHIEVEMENTS } from './global';
import { getGame, getGames } from '@/data/gameCatalog';

/** Registry of every achievement definition, global plus per-game. */
let registry: Map<string, AchievementDefinition> | null = null;

export function getAchievementRegistry(): Map<string, AchievementDefinition> {
  if (registry) return registry;
  const map = new Map<string, AchievementDefinition>();
  for (const a of GLOBAL_ACHIEVEMENTS) map.set(a.id, a);
  for (const game of getGames()) {
    for (const a of game.achievements ?? []) map.set(a.id, a);
  }
  registry = map;
  return map;
}

export function getAllAchievementDefinitions(): AchievementDefinition[] {
  return [...getAchievementRegistry().values()];
}

export function getGameAchievements(gameId: string): AchievementDefinition[] {
  return getGame(gameId)?.achievements ?? [];
}

type UnlockListener = (def: AchievementDefinition) => void;
const unlockListeners = new Set<UnlockListener>();

export function onAchievementUnlocked(fn: UnlockListener): () => void {
  unlockListeners.add(fn);
  return () => {
    unlockListeners.delete(fn);
  };
}

let cache: Map<string, AchievementRecord> | null = null;

async function loadRecords(): Promise<Map<string, AchievementRecord>> {
  if (cache) return cache;
  const rows = await getAchievementRecords();
  cache = new Map(rows.map((r) => [r.achievementId, r]));
  return cache;
}

export function invalidateAchievementCache() {
  cache = null;
  registry = null;
}

export async function getAchievementState(): Promise<AchievementRecord[]> {
  const defs = getAllAchievementDefinitions();
  const records = await loadRecords();
  return defs.map((def) => {
    const rec = records.get(def.id);
    return (
      rec ?? {
        achievementId: def.id,
        gameId: def.gameId,
        unlocked: false,
        unlockedAt: null,
        progress: 0,
        target: def.target ?? 1,
      }
    );
  });
}

/**
 * Records progress toward an achievement and unlocks it when the target is met.
 * Progress never decreases, so repeated calls with a smaller value are safe.
 */
export async function reportProgress(
  achievementId: string,
  progress: number,
): Promise<AchievementDefinition | null> {
  const def = getAchievementRegistry().get(achievementId);
  if (!def) return null;
  const records = await loadRecords();
  const target = def.target ?? 1;
  const existing = records.get(achievementId);
  if (existing?.unlocked) return null;
  const nextProgress = Math.max(existing?.progress ?? 0, progress);
  const unlocked = nextProgress >= target;
  const rec: AchievementRecord = {
    achievementId,
    gameId: def.gameId,
    unlocked,
    unlockedAt: unlocked ? Date.now() : null,
    progress: Math.min(nextProgress, target),
    target,
  };
  records.set(achievementId, rec);
  await putAchievementRecord(rec);
  if (unlocked) {
    if (def.coins) addCoins(def.coins, `Achievement: ${def.name}`);
    await logActivity({
      type: 'achievement',
      gameId: def.gameId,
      message: `Unlocked "${def.name}"`,
      createdAt: Date.now(),
    });
    unlockListeners.forEach((fn) => fn(def));
    void evaluateAchievementMeta();
    return def;
  }
  return null;
}

export async function unlock(achievementId: string): Promise<AchievementDefinition | null> {
  const def = getAchievementRegistry().get(achievementId);
  return reportProgress(achievementId, def?.target ?? 1);
}

export async function isUnlocked(achievementId: string): Promise<boolean> {
  const records = await loadRecords();
  return !!records.get(achievementId)?.unlocked;
}

/** "Unlock N achievements" achievements, re-checked after every unlock. */
async function evaluateAchievementMeta() {
  const records = await loadRecords();
  const count = [...records.values()].filter((r) => r.unlocked).length;
  for (const [id, target] of [
    ['global.achievements-10', 10],
    ['global.achievements-25', 25],
    ['global.achievements-50', 50],
  ] as const) {
    if (count >= target && !records.get(id)?.unlocked) await reportProgress(id, count);
    else if (!records.get(id)?.unlocked) await reportProgress(id, count);
  }
}

/**
 * Recomputes every derived global achievement from the stored statistics.
 * Cheap enough to run whenever a game finishes.
 */
export async function evaluateGlobalAchievements(): Promise<void> {
  const [stats, profile, favorites, highScores] = await Promise.all([
    getAllStats(),
    Promise.resolve(getProfile()),
    Promise.resolve(getFavorites()),
    getAllHighScores(),
  ]);

  const totalPlayed = profile.totalGamesPlayed;
  await reportProgress('global.first-game', totalPlayed);
  await reportProgress('global.play-5', totalPlayed);
  await reportProgress('global.play-10', totalPlayed);
  await reportProgress('global.play-25', totalPlayed);
  await reportProgress('global.play-50', totalPlayed);
  await reportProgress('global.play-100', totalPlayed);

  const totalWins = stats.reduce((sum, s) => sum + s.wins, 0);
  await reportProgress('global.first-win', totalWins);

  const categories = new Set<GameCategory>();
  const counts: Partial<Record<GameCategory, number>> = {};
  for (const s of stats) {
    if (s.gamesStarted <= 0) continue;
    const game = getGame(s.gameId);
    if (!game) continue;
    categories.add(game.category);
    counts[game.category] = (counts[game.category] ?? 0) + 1;
  }
  await reportProgress('global.every-category', categories.size);
  await reportProgress('global.puzzle-beginner', counts.puzzle ?? 0);
  await reportProgress('global.puzzle-master', counts.puzzle ?? 0);
  await reportProgress('global.arcade-fan', counts.arcade ?? 0);
  await reportProgress('global.board-fan', counts.board ?? 0);
  await reportProgress('global.sports-fan', counts.sports ?? 0);
  await reportProgress('global.card-shark', counts.card ?? 0);

  const distinctScoredGames = new Set(highScores.map((h) => h.gameId)).size;
  await reportProgress('global.score-master', distinctScoredGames);

  await reportProgress('global.favorite-5', favorites.length);
  await reportProgress('global.coins-500', profile.totalCoins);
  await reportProgress('global.playtime-1h', profile.totalPlayTime);
}

export async function reportHighScoreBeaten() {
  await reportProgress('global.first-record', 1);
}

export async function getCompletionPercent(): Promise<number> {
  const state = await getAchievementState();
  if (!state.length) return 0;
  const unlocked = state.filter((s) => s.unlocked).length;
  return Math.round((unlocked / state.length) * 100);
}
