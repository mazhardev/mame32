import { CURRENT_DATA_VERSION, site } from '@/config/site';
import type {
  AchievementRecord,
  ActivityRecord,
  DailyChallengeState,
  DifficultySetting,
  ExportBundle,
  GameProgressRecord,
  GameSettingsRecord,
  GameStatistics,
  HighScoreRecord,
  PlayerProfile,
  Preferences,
  RecentGameEntry,
  SavedGameRecord,
  ScoreHistoryRecord,
} from '@/types';
import { LS_KEYS, lsClearAll, lsGet, lsRemove, lsSet } from './local';
import {
  dbClear,
  dbClearAll,
  dbDelete,
  dbGet,
  dbGetAll,
  dbGetAllByIndex,
  dbPut,
  dbStatus,
} from './db';
import { sanitizeNickname } from '@/utils/format';

export const DEFAULT_PREFERENCES: Preferences = {
  sound: true,
  music: false,
  vibration: true,
  difficulty: 'normal',
  reducedMotion: false,
  theme: 'system',
  preferFullscreen: false,
  showFps: false,
  volume: 0.6,
};

const MAX_RECENT = 24;

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

export function subscribe(topic: string, fn: Listener): () => void {
  let set = listeners.get(topic);
  if (!set) {
    set = new Set();
    listeners.set(topic, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
  };
}

export function emit(topic: string) {
  listeners.get(topic)?.forEach((fn) => fn());
  if (topic !== '*') listeners.get('*')?.forEach((fn) => fn());
}

/* ------------------------------------------------------------------ profile */

function makeProfile(): PlayerProfile {
  return {
    id: 'local-player',
    nickname: 'Player',
    createdAt: Date.now(),
    totalGamesPlayed: 0,
    totalPlayTime: 0,
    totalCoins: 0,
  };
}

export function getProfile(): PlayerProfile {
  const stored = lsGet<PlayerProfile | null>(LS_KEYS.profile, null);
  if (!stored) {
    const fresh = makeProfile();
    lsSet(LS_KEYS.profile, fresh);
    return fresh;
  }
  return { ...makeProfile(), ...stored, id: 'local-player' };
}

export function setProfile(patch: Partial<PlayerProfile>): PlayerProfile {
  const next = { ...getProfile(), ...patch, id: 'local-player' as const };
  if (patch.nickname !== undefined) next.nickname = sanitizeNickname(patch.nickname) || 'Player';
  lsSet(LS_KEYS.profile, next);
  void dbPut('profiles', next);
  emit('profile');
  return next;
}

export function setNickname(nickname: string) {
  return setProfile({ nickname });
}

/* -------------------------------------------------------------- preferences */

/**
 * Cached so `useSyncExternalStore` sees a stable snapshot; a fresh object on
 * every read would re-render forever. Invalidated whenever preferences change.
 */
let preferencesCache: Preferences | null = null;

export function getPreferences(): Preferences {
  if (!preferencesCache) {
    preferencesCache = {
      ...DEFAULT_PREFERENCES,
      ...lsGet<Partial<Preferences>>(LS_KEYS.preferences, {}),
    };
  }
  return preferencesCache;
}

export function setPreferences(patch: Partial<Preferences>): Preferences {
  const next = { ...getPreferences(), ...patch };
  preferencesCache = next;
  lsSet(LS_KEYS.preferences, next);
  emit('preferences');
  return next;
}

function invalidatePreferencesCache() {
  preferencesCache = null;
}

/* ---------------------------------------------------------------- favorites */

export function getFavorites(): string[] {
  return lsGet<string[]>(LS_KEYS.favorites, []);
}

export function isFavorite(gameId: string): boolean {
  return getFavorites().includes(gameId);
}

export function toggleFavorite(gameId: string): boolean {
  const list = getFavorites();
  const idx = list.indexOf(gameId);
  if (idx >= 0) list.splice(idx, 1);
  else list.unshift(gameId);
  lsSet(LS_KEYS.favorites, list);
  emit('favorites');
  return idx < 0;
}

/* ----------------------------------------------------------- recently played */

export function getRecentGames(): RecentGameEntry[] {
  return lsGet<RecentGameEntry[]>(LS_KEYS.recentGames, []);
}

export function pushRecentGame(gameId: string) {
  const list = getRecentGames().filter((e) => e.gameId !== gameId);
  list.unshift({ gameId, playedAt: Date.now() });
  lsSet(LS_KEYS.recentGames, list.slice(0, MAX_RECENT));
  lsSet(LS_KEYS.lastGame, gameId);
  emit('recent');
}

export function getLastGame(): string | null {
  return lsGet<string | null>(LS_KEYS.lastGame, null);
}

/* -------------------------------------------------------------------- coins */

export function getCoins(): number {
  return getProfile().totalCoins;
}

export function addCoins(amount: number, reason?: string): number {
  if (!amount) return getCoins();
  const profile = getProfile();
  const total = Math.max(0, profile.totalCoins + amount);
  setProfile({ totalCoins: total });
  if (amount > 0) {
    void logActivity({
      type: 'coins',
      gameId: null,
      message: reason ?? `Earned ${amount} coins`,
      value: amount,
      createdAt: Date.now(),
    });
  }
  emit('coins');
  return total;
}

export function spendCoins(amount: number): boolean {
  const profile = getProfile();
  if (profile.totalCoins < amount) return false;
  setProfile({ totalCoins: profile.totalCoins - amount });
  emit('coins');
  return true;
}

/* --------------------------------------------------------------- cosmetics */

export function getUnlockedCosmetics(): string[] {
  return lsGet<string[]>(LS_KEYS.unlockedCosmetics, []);
}

export function unlockCosmetic(id: string, price: number): boolean {
  const owned = getUnlockedCosmetics();
  if (owned.includes(id)) return true;
  if (!spendCoins(price)) return false;
  owned.push(id);
  lsSet(LS_KEYS.unlockedCosmetics, owned);
  emit('cosmetics');
  return true;
}

export function getEquippedCosmetics(): Record<string, string> {
  return lsGet<Record<string, string>>(LS_KEYS.equippedCosmetics, {});
}

export function equipCosmetic(slot: string, id: string) {
  const map = getEquippedCosmetics();
  map[slot] = id;
  lsSet(LS_KEYS.equippedCosmetics, map);
  emit('cosmetics');
}

/* -------------------------------------------------------------- high scores */

function highScoreId(gameId: string, mode: string, difficulty: DifficultySetting) {
  return `${gameId}::${mode}::${difficulty}`;
}

export async function getHighScore(
  gameId: string,
  mode = 'default',
  difficulty: DifficultySetting = 'normal',
): Promise<number | null> {
  const rec = await dbGet<HighScoreRecord>('highScores', highScoreId(gameId, mode, difficulty));
  return rec ? rec.score : null;
}

export async function getBestHighScore(gameId: string): Promise<number | null> {
  const rows = await dbGetAllByIndex<HighScoreRecord>('highScores', 'gameId', gameId);
  if (!rows.length) return null;
  return rows.reduce((best, r) => (r.score > best ? r.score : best), rows[0].score);
}

export async function getAllHighScores(): Promise<HighScoreRecord[]> {
  return dbGetAll<HighScoreRecord>('highScores');
}

/**
 * Persists a score when it beats the stored record.
 * `direction` lets timing games treat a lower value as better.
 */
export async function setHighScore(
  gameId: string,
  score: number,
  opts: {
    mode?: string;
    difficulty?: DifficultySetting;
    direction?: 'high' | 'low';
  } = {},
): Promise<{ isRecord: boolean; previous: number | null }> {
  const mode = opts.mode ?? 'default';
  const difficulty = opts.difficulty ?? 'normal';
  const direction = opts.direction ?? 'high';
  const id = highScoreId(gameId, mode, difficulty);
  const existing = await dbGet<HighScoreRecord>('highScores', id);
  const previous = existing ? existing.score : null;
  const better = previous === null || (direction === 'high' ? score > previous : score < previous);
  if (better) {
    await dbPut<HighScoreRecord>('highScores', {
      id,
      gameId,
      mode,
      difficulty,
      score,
      createdAt: Date.now(),
    });
    emit('scores');
  }
  return { isRecord: better, previous };
}

export async function addScoreHistory(entry: Omit<ScoreHistoryRecord, 'id'>) {
  await dbPut('scoreHistory', entry);
}

export async function getScoreHistory(gameId?: string): Promise<ScoreHistoryRecord[]> {
  const rows = gameId
    ? await dbGetAllByIndex<ScoreHistoryRecord>('scoreHistory', 'gameId', gameId)
    : await dbGetAll<ScoreHistoryRecord>('scoreHistory');
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

/* ----------------------------------------------------------------- progress */

export async function saveProgress(
  gameId: string,
  state: unknown,
  meta: { level?: number; percent?: number; label?: string; checkpoint?: string } = {},
): Promise<void> {
  await dbPut<GameProgressRecord>('gameProgress', {
    gameId,
    state,
    updatedAt: Date.now(),
    ...meta,
  });
  emit('progress');
}

export async function loadProgress<T = unknown>(gameId: string): Promise<T | null> {
  const rec = await dbGet<GameProgressRecord>('gameProgress', gameId);
  return rec ? (rec.state as T) : null;
}

export async function getProgressRecord(gameId: string): Promise<GameProgressRecord | null> {
  return dbGet<GameProgressRecord>('gameProgress', gameId);
}

export async function getAllProgress(): Promise<GameProgressRecord[]> {
  const rows = await dbGetAll<GameProgressRecord>('gameProgress');
  return rows.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function clearProgress(gameId: string): Promise<void> {
  await dbDelete('gameProgress', gameId);
  emit('progress');
}

/* -------------------------------------------------------------- saved games */

export async function listSavedGames(gameId?: string): Promise<SavedGameRecord[]> {
  const rows = gameId
    ? await dbGetAllByIndex<SavedGameRecord>('savedGames', 'gameId', gameId)
    : await dbGetAll<SavedGameRecord>('savedGames');
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function writeSavedGame(rec: SavedGameRecord): Promise<void> {
  await dbPut('savedGames', rec);
  emit('saves');
}

export async function deleteSavedGame(id: string): Promise<void> {
  await dbDelete('savedGames', id);
  emit('saves');
}

/* ------------------------------------------------------------ game settings */

export async function getGameSettings<T extends object>(
  gameId: string,
  defaults: T,
): Promise<T & GameSettingsRecord> {
  const rec = await dbGet<GameSettingsRecord>('gameSettings', gameId);
  return { gameId, ...defaults, ...(rec ?? {}) } as T & GameSettingsRecord;
}

export async function setGameSettings(gameId: string, patch: object): Promise<void> {
  const rec = (await dbGet<GameSettingsRecord>('gameSettings', gameId)) ?? { gameId };
  await dbPut('gameSettings', { ...rec, ...patch, gameId });
  emit('gameSettings');
}

/* --------------------------------------------------------------- statistics */

export function blankStats(gameId: string): GameStatistics {
  return {
    gameId,
    gamesStarted: 0,
    gamesCompleted: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    highScore: null,
    bestTime: null,
    totalScore: 0,
    totalPlayTime: 0,
    lastPlayed: null,
    currentWinStreak: 0,
    bestWinStreak: 0,
  };
}

export async function getStats(gameId: string): Promise<GameStatistics> {
  const rec = await dbGet<GameStatistics>('statistics', gameId);
  return { ...blankStats(gameId), ...(rec ?? {}) };
}

export async function getAllStats(): Promise<GameStatistics[]> {
  return dbGetAll<GameStatistics>('statistics');
}

/**
 * Serialises read-modify-write cycles on one game's statistics record.
 * `recordGameComplete` and `addPlayTime` are commonly fired back to back and
 * without this the later read could start before the earlier write landed,
 * silently discarding one of the updates.
 */
const statsQueues = new Map<string, Promise<unknown>>();

function withStats<T>(
  gameId: string,
  mutate: (stats: GameStatistics) => T | Promise<T>,
): Promise<T> {
  const previous = statsQueues.get(gameId) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      const stats = await getStats(gameId);
      const outcome = await mutate(stats);
      await dbPut('statistics', stats);
      return outcome;
    });
  statsQueues.set(
    gameId,
    next.catch(() => undefined),
  );
  return next;
}

export async function recordGameStart(gameId: string): Promise<void> {
  await withStats(gameId, (stats) => {
    stats.gamesStarted += 1;
    stats.lastPlayed = Date.now();
  });
  pushRecentGame(gameId);
  const profile = getProfile();
  setProfile({ totalGamesPlayed: profile.totalGamesPlayed + 1 });
  emit('stats');
}

export interface GameResult {
  score?: number;
  won?: boolean;
  lost?: boolean;
  draw?: boolean;
  completed?: boolean;
  /**
   * How long this round lasted. Stored on the score-history entry only —
   * `addPlayTime` is the single funnel that accumulates played time, so passing
   * a duration here never double-counts against the per-game or profile totals.
   */
  durationMs?: number;
  timeMs?: number;
  difficulty?: DifficultySetting;
  mode?: string;
  scoreDirection?: 'high' | 'low';
}

/** Single funnel every game uses when a round ends. */
export async function recordGameComplete(
  gameId: string,
  result: GameResult,
): Promise<{ isRecord: boolean; previousBest: number | null }> {
  const now = Date.now();
  await withStats(gameId, (stats) => {
    stats.lastPlayed = now;
    if (result.completed !== false) stats.gamesCompleted += 1;
    if (result.won) {
      stats.wins += 1;
      stats.currentWinStreak += 1;
      stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.currentWinStreak);
    } else if (result.lost) {
      stats.losses += 1;
      stats.currentWinStreak = 0;
    } else if (result.draw) {
      stats.draws += 1;
    }
    if (typeof result.score === 'number') {
      stats.totalScore += result.score;
      if (stats.highScore === null || result.score > stats.highScore) {
        stats.highScore = result.score;
      }
    }
    if (typeof result.timeMs === 'number' && result.timeMs > 0) {
      if (stats.bestTime === null || result.timeMs < stats.bestTime) stats.bestTime = result.timeMs;
    }
  });

  let isRecord = false;
  let previousBest: number | null = null;
  if (typeof result.score === 'number') {
    const outcome = await setHighScore(gameId, result.score, {
      mode: result.mode,
      difficulty: result.difficulty,
      direction: result.scoreDirection,
    });
    isRecord = outcome.isRecord && outcome.previous !== null;
    previousBest = outcome.previous;
    await addScoreHistory({
      gameId,
      score: result.score,
      difficulty: result.difficulty ?? 'normal',
      won: !!result.won,
      durationMs: result.durationMs ?? 0,
      createdAt: now,
    });
  }
  emit('stats');
  return { isRecord, previousBest };
}

/**
 * The only place played time is accumulated, for both the per-game record and
 * the profile total. Games and shells must not add duration anywhere else.
 */
export async function addPlayTime(gameId: string, ms: number): Promise<void> {
  if (ms <= 0) return;
  await withStats(gameId, (stats) => {
    stats.totalPlayTime += ms;
    stats.lastPlayed = Date.now();
  });
  const profile = getProfile();
  setProfile({ totalPlayTime: profile.totalPlayTime + ms });
  emit('stats');
}

/* ------------------------------------------------------------- achievements */

export async function getAchievementRecords(): Promise<AchievementRecord[]> {
  return dbGetAll<AchievementRecord>('achievements');
}

export async function getAchievementRecord(id: string): Promise<AchievementRecord | null> {
  return dbGet<AchievementRecord>('achievements', id);
}

export async function putAchievementRecord(rec: AchievementRecord): Promise<void> {
  await dbPut('achievements', rec);
  emit('achievements');
}

/* ----------------------------------------------------------------- activity */

export async function logActivity(entry: ActivityRecord): Promise<void> {
  await dbPut('activityHistory', entry);
}

export async function getActivity(limit = 50): Promise<ActivityRecord[]> {
  const rows = await dbGetAll<ActivityRecord>('activityHistory');
  return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

/* --------------------------------------------------------- daily challenge */

export function getDailyChallengeState(): DailyChallengeState | null {
  return lsGet<DailyChallengeState | null>(LS_KEYS.dailyChallenge, null);
}

export function setDailyChallengeState(state: DailyChallengeState) {
  lsSet(LS_KEYS.dailyChallenge, state);
  emit('daily');
}

/* ------------------------------------------------------------ export/import */

export async function exportData(): Promise<ExportBundle> {
  return {
    app: site.siteName,
    dataVersion: CURRENT_DATA_VERSION,
    exportedAt: Date.now(),
    profile: getProfile(),
    preferences: getPreferences(),
    favorites: getFavorites(),
    recentGames: getRecentGames(),
    highScores: await dbGetAll<HighScoreRecord>('highScores'),
    scoreHistory: await dbGetAll<ScoreHistoryRecord>('scoreHistory'),
    achievements: await dbGetAll<AchievementRecord>('achievements'),
    statistics: await dbGetAll<GameStatistics>('statistics'),
    gameProgress: await dbGetAll<GameProgressRecord>('gameProgress'),
    gameSettings: await dbGetAll<GameSettingsRecord>('gameSettings'),
    savedGames: await dbGetAll<SavedGameRecord>('savedGames'),
    activity: await dbGetAll<ActivityRecord>('activityHistory'),
    dailyChallenge: getDailyChallengeState(),
  };
}

export interface ImportOutcome {
  ok: boolean;
  error?: string;
  imported?: Record<string, number>;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function pickArray<T>(value: unknown, validate: (v: unknown) => boolean): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(validate) as T[];
}

/**
 * Validates an exported bundle field by field, then writes only known shapes.
 * Nothing from the file is ever executed and unknown keys are dropped.
 */
export async function importData(raw: unknown): Promise<ImportOutcome> {
  if (!isObject(raw)) return { ok: false, error: 'File is not a valid save bundle.' };
  if (typeof raw.dataVersion !== 'number')
    return { ok: false, error: 'Missing dataVersion — this is not an arcade save file.' };
  if (raw.dataVersion > CURRENT_DATA_VERSION)
    return {
      ok: false,
      error: `Save file version ${raw.dataVersion} is newer than this app supports.`,
    };

  const imported: Record<string, number> = {};

  if (isObject(raw.profile)) {
    const p = raw.profile;
    setProfile({
      nickname: typeof p.nickname === 'string' ? p.nickname : 'Player',
      createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
      totalGamesPlayed: typeof p.totalGamesPlayed === 'number' ? p.totalGamesPlayed : 0,
      totalPlayTime: typeof p.totalPlayTime === 'number' ? p.totalPlayTime : 0,
      totalCoins: typeof p.totalCoins === 'number' ? Math.max(0, p.totalCoins) : 0,
    });
    imported.profile = 1;
  }

  if (isObject(raw.preferences)) {
    const allowed = Object.keys(DEFAULT_PREFERENCES) as (keyof Preferences)[];
    const clean: Partial<Preferences> = {};
    for (const key of allowed) {
      const value = (raw.preferences as Record<string, unknown>)[key];
      if (typeof value === typeof DEFAULT_PREFERENCES[key]) {
        (clean as Record<string, unknown>)[key] = value;
      }
    }
    setPreferences(clean);
    imported.preferences = 1;
  }

  if (Array.isArray(raw.favorites)) {
    const favs = raw.favorites.filter((f): f is string => typeof f === 'string');
    lsSet(LS_KEYS.favorites, favs);
    imported.favorites = favs.length;
  }

  if (Array.isArray(raw.recentGames)) {
    const recents = raw.recentGames.filter(
      (r) => isObject(r) && typeof r.gameId === 'string' && typeof r.playedAt === 'number',
    ) as RecentGameEntry[];
    lsSet(LS_KEYS.recentGames, recents.slice(0, MAX_RECENT));
    imported.recentGames = recents.length;
  }

  const highScores = pickArray<HighScoreRecord>(
    raw.highScores,
    (r) => isObject(r) && typeof r.id === 'string' && typeof r.score === 'number',
  );
  for (const rec of highScores) await dbPut('highScores', rec);
  imported.highScores = highScores.length;

  const stats = pickArray<GameStatistics>(
    raw.statistics,
    (r) => isObject(r) && typeof r.gameId === 'string',
  );
  for (const rec of stats) await dbPut('statistics', { ...blankStats(rec.gameId), ...rec });
  imported.statistics = stats.length;

  const achievements = pickArray<AchievementRecord>(
    raw.achievements,
    (r) => isObject(r) && typeof r.achievementId === 'string',
  );
  for (const rec of achievements) await dbPut('achievements', rec);
  imported.achievements = achievements.length;

  const progress = pickArray<GameProgressRecord>(
    raw.gameProgress,
    (r) => isObject(r) && typeof r.gameId === 'string',
  );
  for (const rec of progress) await dbPut('gameProgress', rec);
  imported.gameProgress = progress.length;

  const settings = pickArray<GameSettingsRecord>(
    raw.gameSettings,
    (r) => isObject(r) && typeof r.gameId === 'string',
  );
  for (const rec of settings) await dbPut('gameSettings', rec);
  imported.gameSettings = settings.length;

  const saves = pickArray<SavedGameRecord>(
    raw.savedGames,
    (r) => isObject(r) && typeof r.id === 'string' && typeof r.gameId === 'string',
  );
  for (const rec of saves) await dbPut('savedGames', rec);
  imported.savedGames = saves.length;

  const history = pickArray<ScoreHistoryRecord>(
    raw.scoreHistory,
    (r) => isObject(r) && typeof r.gameId === 'string' && typeof r.score === 'number',
  );
  for (const rec of history) {
    const rest = { ...rec } as Partial<ScoreHistoryRecord>;
    delete rest.id;
    await dbPut('scoreHistory', rest);
  }
  imported.scoreHistory = history.length;

  if (isObject(raw.dailyChallenge) && typeof raw.dailyChallenge.date === 'string') {
    setDailyChallengeState(raw.dailyChallenge as unknown as DailyChallengeState);
  }

  lsSet(LS_KEYS.dataVersion, CURRENT_DATA_VERSION);
  emit('*');
  return { ok: true, imported };
}

/* -------------------------------------------------------------------- reset */

export async function resetGameData(gameId: string): Promise<void> {
  await dbDelete('statistics', gameId);
  await dbDelete('gameProgress', gameId);
  await dbDelete('gameSettings', gameId);
  const scores = await dbGetAllByIndex<HighScoreRecord>('highScores', 'gameId', gameId);
  for (const s of scores) await dbDelete('highScores', s.id);
  const saves = await dbGetAllByIndex<SavedGameRecord>('savedGames', 'gameId', gameId);
  for (const s of saves) await dbDelete('savedGames', s.id);
  emit('*');
}

export async function resetAchievements(): Promise<void> {
  await dbClear('achievements');
  emit('*');
}

export async function resetScores(): Promise<void> {
  await dbClear('highScores');
  await dbClear('scoreHistory');
  emit('*');
}

export async function resetProgress(): Promise<void> {
  await dbClear('gameProgress');
  await dbClear('savedGames');
  emit('*');
}

export async function resetEverything(): Promise<void> {
  // Drop queued stats writes so a pending mutation cannot resurrect cleared data.
  statsQueues.clear();
  await dbClearAll();
  lsClearAll();
  lsRemove(LS_KEYS.profile);
  invalidatePreferencesCache();
  emit('*');
}

export function storageAvailable() {
  return dbStatus;
}

export function runMigrations() {
  const version = lsGet<number>(LS_KEYS.dataVersion, 0);
  if (version === CURRENT_DATA_VERSION) return;
  // Version 0 -> 1 is the first release: nothing to rewrite, just stamp the version
  // so future migrations know which shape the stored data already has.
  lsSet(LS_KEYS.dataVersion, CURRENT_DATA_VERSION);
}

export const storage = {
  getProfile,
  setProfile,
  setNickname,
  getPreferences,
  setPreferences,
  getFavorites,
  isFavorite,
  toggleFavorite,
  getRecentGames,
  pushRecentGame,
  getLastGame,
  getCoins,
  addCoins,
  spendCoins,
  getHighScore,
  getBestHighScore,
  setHighScore,
  saveProgress,
  loadProgress,
  clearProgress,
  recordGameStart,
  recordGameComplete,
  addPlayTime,
  getStats,
  getAllStats,
  exportData,
  importData,
};
