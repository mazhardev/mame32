import { beforeEach, describe, expect, it } from 'vitest';
import {
  addCoins,
  exportData,
  getCoins,
  getHighScore,
  getProfile,
  getStats,
  importData,
  recordGameComplete,
  resetEverything,
  setHighScore,
  setNickname,
  spendCoins,
  saveProgress,
  loadProgress,
  toggleFavorite,
  getFavorites,
} from './StorageService';
import { CURRENT_DATA_VERSION } from '@/config/site';

beforeEach(async () => {
  await resetEverything();
});

describe('high scores', () => {
  it('records the first score as a record with no previous value', async () => {
    const res = await setHighScore('snake', 30);
    expect(res.isRecord).toBe(true);
    expect(res.previous).toBeNull();
    expect(await getHighScore('snake')).toBe(30);
  });

  it('keeps the higher score for high-is-better games', async () => {
    await setHighScore('snake', 30);
    const worse = await setHighScore('snake', 12);
    expect(worse.isRecord).toBe(false);
    expect(await getHighScore('snake')).toBe(30);

    const better = await setHighScore('snake', 45);
    expect(better.isRecord).toBe(true);
    expect(better.previous).toBe(30);
    expect(await getHighScore('snake')).toBe(45);
  });

  it('keeps the lower score when direction is low', async () => {
    await setHighScore('reaction-timer', 320, { direction: 'low' });
    await setHighScore('reaction-timer', 410, { direction: 'low' });
    expect(await getHighScore('reaction-timer')).toBe(320);
    await setHighScore('reaction-timer', 240, { direction: 'low' });
    expect(await getHighScore('reaction-timer')).toBe(240);
  });

  it('separates scores per mode and difficulty', async () => {
    await setHighScore('sudoku', 100, { difficulty: 'easy' });
    await setHighScore('sudoku', 500, { difficulty: 'hard' });
    expect(await getHighScore('sudoku', 'default', 'easy')).toBe(100);
    expect(await getHighScore('sudoku', 'default', 'hard')).toBe(500);
  });
});

describe('statistics', () => {
  it('accumulates wins, losses and streaks', async () => {
    await recordGameComplete('chess', { won: true, score: 1 });
    await recordGameComplete('chess', { won: true, score: 1 });
    await recordGameComplete('chess', { lost: true, score: 0 });
    const stats = await getStats('chess');
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.bestWinStreak).toBe(2);
    expect(stats.currentWinStreak).toBe(0);
    expect(stats.gamesCompleted).toBe(3);
  });

  it('tracks the best time when a game reports one', async () => {
    await recordGameComplete('sliding-puzzle', { won: true, timeMs: 45_000 });
    await recordGameComplete('sliding-puzzle', { won: true, timeMs: 30_000 });
    await recordGameComplete('sliding-puzzle', { won: true, timeMs: 61_000 });
    expect((await getStats('sliding-puzzle')).bestTime).toBe(30_000);
  });

  it('reports a record only when a previous best existed', async () => {
    const first = await recordGameComplete('snake', { score: 20 });
    expect(first.isRecord).toBe(false);
    const second = await recordGameComplete('snake', { score: 35 });
    expect(second.isRecord).toBe(true);
    expect(second.previousBest).toBe(20);
  });
});

describe('coins', () => {
  it('adds and spends coins without going negative', () => {
    addCoins(50);
    expect(getCoins()).toBe(50);
    expect(spendCoins(80)).toBe(false);
    expect(getCoins()).toBe(50);
    expect(spendCoins(20)).toBe(true);
    expect(getCoins()).toBe(30);
  });
});

describe('favorites', () => {
  it('toggles on and off', () => {
    expect(toggleFavorite('pong')).toBe(true);
    expect(getFavorites()).toContain('pong');
    expect(toggleFavorite('pong')).toBe(false);
    expect(getFavorites()).not.toContain('pong');
  });
});

describe('progress', () => {
  it('round-trips arbitrary saved state', async () => {
    await saveProgress('sudoku', { board: [1, 2, 3], elapsed: 90 }, { percent: 45 });
    expect(await loadProgress('sudoku')).toEqual({ board: [1, 2, 3], elapsed: 90 });
  });
});

describe('nickname sanitising', () => {
  it('strips markup characters and trims length', () => {
    const profile = setNickname('  <script>alert</script>  ');
    expect(profile.nickname).not.toContain('<');
    expect(profile.nickname.length).toBeLessThanOrEqual(20);
  });

  it('falls back to Player when the result is empty', () => {
    expect(setNickname('<<<>>>').nickname).toBe('Player');
  });
});

describe('export / import', () => {
  it('round-trips a bundle', async () => {
    setNickname('Tester');
    addCoins(120);
    toggleFavorite('snake');
    await setHighScore('snake', 42);
    const bundle = await exportData();

    await resetEverything();
    expect(getCoins()).toBe(0);

    const result = await importData(bundle);
    expect(result.ok).toBe(true);
    expect(getProfile().nickname).toBe('Tester');
    expect(getCoins()).toBe(120);
    expect(getFavorites()).toContain('snake');
    expect(await getHighScore('snake')).toBe(42);
  });

  it('rejects a file that is not an object', async () => {
    expect((await importData('nope')).ok).toBe(false);
    expect((await importData(null)).ok).toBe(false);
    expect((await importData([1, 2, 3])).ok).toBe(false);
  });

  it('rejects a bundle without a data version', async () => {
    const res = await importData({ profile: { nickname: 'x' } });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/dataVersion/);
  });

  it('rejects a bundle from a newer schema', async () => {
    const res = await importData({ dataVersion: CURRENT_DATA_VERSION + 5 });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/newer/);
  });

  it('ignores unexpected fields instead of storing them', async () => {
    const res = await importData({
      dataVersion: CURRENT_DATA_VERSION,
      profile: { nickname: 'Imported', evil: 'payload', totalCoins: 10 },
      favorites: ['pong', 42, { bad: true }],
      highScores: [{ id: 'ok::default::normal', gameId: 'ok', score: 7 }, { junk: true }],
    });
    expect(res.ok).toBe(true);
    expect(getProfile()).not.toHaveProperty('evil');
    expect(getFavorites()).toEqual(['pong']);
    expect(res.imported?.highScores).toBe(1);
  });

  it('clamps negative coin totals from a tampered file', async () => {
    await importData({ dataVersion: CURRENT_DATA_VERSION, profile: { totalCoins: -999 } });
    expect(getCoins()).toBe(0);
  });
});
