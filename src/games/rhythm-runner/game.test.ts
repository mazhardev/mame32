import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import type { Input } from '../_shared/arcade/kit';
import { GRAVITY, JUMP, UNIT, buildCourse, create, obstacleRect, update } from './game';
import type { State } from './game';

const STEP = 1 / 120;
const HORIZON = 180; // frames (1.5 s)

function clone(s: State): State {
  return { ...s, sparks: [], events: [] };
}

/**
 * Can the runner survive the next `frames` frames from this state? Branches
 * on "jump" / "wait" at every frame where a jump is possible, with memo on
 * the runner's vertical state (distance is fixed by the frame number).
 */
function canSurvive(s: State, frames: number, memo = new Map<string, boolean>()): boolean {
  if (frames <= 0 || s.won) return true;
  const key = `${frames}|${Math.round(s.y)}|${Math.round(s.vy)}|${s.grounded}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const options = s.grounded ? [false, true] : [false];
  let ok = false;
  for (const jump of options) {
    const t = clone(s);
    update(t, STEP, jump ? inputWith(['action']) : emptyInput(), () => 0.5);
    if (!t.over || t.won) {
      if (canSurvive(t, frames - 1, memo)) {
        ok = true;
        break;
      }
    }
  }
  memo.set(key, ok);
  return ok;
}

/** Waits whenever waiting is survivable, otherwise jumps. */
function autopilot(s: State): Input {
  if (!s.grounded) return emptyInput();
  const wait = clone(s);
  update(wait, STEP, emptyInput(), () => 0.5);
  if (!wait.over && canSurvive(wait, HORIZON)) return emptyInput();
  return inputWith(['action']);
}

describe('rhythm runner', () => {
  it('builds the same course every time for a difficulty', () => {
    expect(buildCourse('normal')).toEqual(buildCourse('normal'));
    expect(buildCourse('hard').length).toBeGreaterThan(buildCourse('easy').length);
  });

  it('jumps higher than a two-block step', () => {
    const peak = (JUMP * JUMP) / (2 * GRAVITY);
    expect(peak).toBeGreaterThan(UNIT * 2);
  });

  it('crashes into a spike on the ground', () => {
    const s = create('easy');
    s.course = [{ kind: 'spike', x: 5, w: 1, h: 1, base: 0 }];
    for (let i = 0; i < 120 && !s.over; i++) update(s, 1 / 60, emptyInput(), Math.random);
    expect(s.over).toBe(true);
    expect(s.won).toBe(false);
  });

  it('lands on top of a block', () => {
    const s = create('easy');
    s.course = [{ kind: 'block', x: 6, w: 6, h: 1, base: 0 }];
    s.y = 100;
    s.vy = 0;
    s.grounded = false;
    s.distance = 6 * UNIT - 140 + 40;
    for (let i = 0; i < 60; i++) update(s, 1 / 120, emptyInput(), Math.random);
    expect(s.over).toBe(false);
    expect(s.grounded).toBe(true);
    expect(s.y).toBe(obstacleRect(s.course[0]).y);
  });

  it('can be completed on every difficulty by a careful player', () => {
    for (const d of ['easy', 'normal', 'hard'] as const) {
      const s = create(d);
      for (let i = 0; i < 60 * 120 && !s.over; i++) update(s, STEP, autopilot(s), Math.random);
      expect(s.won, `${d} crashed at ${s.score}%`).toBe(true);
    }
  });
});
