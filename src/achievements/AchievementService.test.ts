import { beforeEach, describe, expect, it } from 'vitest';
import { resetEverything } from '@/storage/StorageService';
import {
  getAchievementState,
  incrementProgress,
  invalidateAchievementCache,
  reportProgress,
} from './AchievementService';

// sudoku.solve-10 is a real cumulative achievement with a target of 10.
const COUNTER = 'sudoku.solve-10';
const progressOf = async (id: string) =>
  (await getAchievementState()).find((r) => r.achievementId === id)!;

beforeEach(async () => {
  await resetEverything();
  invalidateAchievementCache();
});

describe('achievement progress', () => {
  it('keeps the best value reported, never lowering it', async () => {
    await reportProgress(COUNTER, 4);
    await reportProgress(COUNTER, 2);
    expect((await progressOf(COUNTER)).progress).toBe(4);
  });

  it('adds deltas with incrementProgress and unlocks at the target', async () => {
    for (let i = 0; i < 9; i++) await incrementProgress(COUNTER);
    expect((await progressOf(COUNTER)).unlocked).toBe(false);
    const unlocked = await incrementProgress(COUNTER);
    expect(unlocked?.id).toBe(COUNTER);
    const rec = await progressOf(COUNTER);
    expect(rec.unlocked).toBe(true);
    expect(rec.progress).toBe(10);
  });

  it('does not lose concurrent increments', async () => {
    await Promise.all([1, 2, 3, 4, 5].map(() => incrementProgress(COUNTER)));
    expect((await progressOf(COUNTER)).progress).toBe(5);
  });

  it('persists progress across a cold cache', async () => {
    await incrementProgress(COUNTER, 3);
    invalidateAchievementCache();
    await incrementProgress(COUNTER, 2);
    expect((await progressOf(COUNTER)).progress).toBe(5);
  });

  it('ignores unknown achievement ids', async () => {
    expect(await incrementProgress('no-such.achievement')).toBeNull();
  });
});
