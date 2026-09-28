import { describe, expect, it } from 'vitest';
import { boxesOnGoals, deadSquares, isSolved, parseLevel, serializeLevel, solvePushes, step } from './engine';
import { LEVEL_PACKS } from './levels';

const room = ['#######', '#     #', '# $ . #', '#  @  #', '#######'].join('\n');

describe('sokoban rules', () => {
  it('parses and re-serialises the text format', () => {
    const { level, state } = parseLevel(room);
    expect(level.w).toBe(7);
    expect(level.goals.size).toBe(1);
    expect(state.boxes).toHaveLength(1);
    expect(serializeLevel(level, state)).toBe(room);
  });

  it('walks, pushes, and refuses to push into walls or other boxes', () => {
    const { level, state } = parseLevel(room);
    // Keeper at (3,3); step left to (2,3), then up pushes the box from (2,2) to (2,1).
    const left = step(level, state, 'left')!;
    expect(left.pushed).toBe(false);
    const up = step(level, left.state, 'up')!;
    expect(up.pushed).toBe(true);
    expect(step(level, up.state, 'up')).toBeNull(); // box now against the top wall
    const twoBoxes = parseLevel(['######', '#@$$ #', '######'].join('\n'));
    expect(step(twoBoxes.level, twoBoxes.state, 'right')).toBeNull();
  });

  it('marks corner squares as dead but never goals', () => {
    const { level } = parseLevel(room);
    const dead = deadSquares(level);
    expect(dead.has(1 * 7 + 1)).toBe(true); // top-left corner
    expect(dead.has(2 * 7 + 4)).toBe(false); // the goal
  });

  it('finds the minimum number of pushes', () => {
    const { level, state } = parseLevel(room);
    expect(solvePushes(level, state)).toBe(2);
    expect(isSolved(level, state)).toBe(false);
    expect(boxesOnGoals(level, state)).toBe(0);
  });
});

describe('sokoban level packs', () => {
  it('ships 15 solvable rooms per pack with the stored minimum', () => {
    for (const [pack, levels] of Object.entries(LEVEL_PACKS)) {
      expect(levels.length, pack).toBe(15);
      for (const { text, pushes } of levels) {
        const { level, state } = parseLevel(text);
        expect(state.player).toBeGreaterThanOrEqual(0);
        expect(level.goals.size).toBe(state.boxes.length);
        expect(solvePushes(level, state, 400_000), text).toBe(pushes);
      }
    }
  });
});
