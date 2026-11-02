import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { create, frame, inPlay, nudge, update } from './game';
import type { State } from './game';
import { BALL_R, BUMPERS, DROPS, DROP_X, H, LANE_REST_Y, SAUCER, W } from './table';

const frames = (s: State, n: number) => {
  for (let i = 0; i < n && !s.over; i++) frame(s);
};

/** Puts the first ball into the playfield at a spot with a velocity. */
function place(s: State, x: number, y: number, vx = 0, vy = 0) {
  const b = inPlay(s)[0];
  Object.assign(b, { x, y, vx, vy, inLane: false, held: -1 });
  return b;
}

function rng(seed: number) {
  let v = seed >>> 0;
  return () => ((v = (v * 1664525 + 1013904223) >>> 0) / 4294967296);
}

describe('the plunger', () => {
  it('a ball waits in the lane until launched', () => {
    const s = create('normal');
    frames(s, 120);
    const b = inPlay(s)[0];
    expect(b.inLane).toBe(true);
    expect(b.y).toBeCloseTo(LANE_REST_Y, 0);
  });

  it('holding and releasing launches the ball round into the playfield', () => {
    const s = create('normal');
    for (let i = 0; i < 60; i++) update(s, 1 / 60, inputWith(['down']));
    expect(s.plunger).toBeGreaterThan(0.9);
    update(s, 1 / 60, emptyInput());
    frames(s, 90);
    const b = inPlay(s)[0];
    expect(b.inLane).toBe(false);
    expect(b.x).toBeLessThan(230);
    expect(s.saveT).toBeGreaterThan(0);
  });

  it('a weak launch rolls back down the lane', () => {
    const s = create('normal');
    update(s, 1 / 60, inputWith(['down']));
    update(s, 1 / 60, emptyInput());
    frames(s, 240);
    expect(inPlay(s)[0].inLane).toBe(true);
  });
});

describe('the table', () => {
  it('a raised flipper fires a ball resting on it up the table', () => {
    const s = create('normal');
    // Let a ball settle on the left flipper, then flip.
    place(s, 100, 420);
    frames(s, 40);
    s.flippers[0].held = true;
    let fastest = 0;
    for (let i = 0; i < 30; i++) {
      frame(s);
      fastest = Math.min(fastest, inPlay(s)[0].vy);
    }
    expect(fastest).toBeLessThan(-500);
  });

  it('bumpers score and kick the ball away', () => {
    const s = create('normal');
    const c = BUMPERS[0];
    place(s, c.x, c.y - c.r - BALL_R - 4, 0, 150);
    frames(s, 10);
    expect(s.score).toBeGreaterThanOrEqual(100);
    expect(Math.hypot(inPlay(s)[0].vx, inPlay(s)[0].vy)).toBeGreaterThan(300);
  });

  it('balls never leave the table during long random play', () => {
    const s = create('easy');
    s.ballsLeft = 50;
    const r = rng(9);
    for (let i = 0; i < 60 * 240 && !s.over; i++) {
      const lb = inPlay(s).find((b) => b.inLane);
      if (lb && lb.y > LANE_REST_Y - 1 && s.bonusT < 0) lb.vy = -(450 + r() * 800);
      s.flippers[0].held = r() < 0.3;
      s.flippers[1].held = r() < 0.3;
      if (r() < 0.002) nudge(s, r() < 0.5 ? -1 : 1);
      frame(s);
      for (const b of inPlay(s)) {
        expect(b.x).toBeGreaterThan(0);
        expect(b.x).toBeLessThan(W);
        expect(b.y).toBeGreaterThan(-BALL_R);
        expect(b.y).toBeLessThan(H + 20);
      }
    }
    expect(s.score).toBeGreaterThan(0);
  }, 60_000);
});

describe('rules', () => {
  it('all three star lanes raise the bonus multiplier', () => {
    const s = create('normal');
    s.lanes = [true, true, false];
    place(s, 163, 50, 0, 60);
    frames(s, 30);
    expect(s.mult).toBe(2);
    expect(s.lanes).toEqual([false, false, false]);
  });

  it('flipping shifts the lit lanes', () => {
    const s = create('normal');
    s.lanes = [true, false, false];
    update(s, 1 / 60, inputWith(['right']));
    expect(s.lanes).toEqual([false, true, false]);
  });

  it('dropping all targets lights the lock; two locks start multiball and jackpots follow', () => {
    const s = create('normal');
    DROPS.forEach((d) => {
      place(s, DROP_X - 20, (d.y1 + d.y2) / 2, 500, 0);
      frames(s, 8);
    });
    expect(s.drops.every((d) => !d)).toBe(true);
    expect(s.lockLit).toBe(true);
    place(s, SAUCER.x, SAUCER.y - 3, 0, 40);
    frames(s, 3);
    expect(s.locks).toBe(1);
    frames(s, 90);
    s.lockLit = true;
    place(s, SAUCER.x, SAUCER.y - 3, 0, 40);
    frames(s, 3);
    expect(s.multiball).toBe(true);
    expect(inPlay(s).length).toBe(3);
    const before = s.score;
    frames(s, 90);
    place(s, SAUCER.x, SAUCER.y - 3, 0, 40);
    frames(s, 3);
    expect(s.score - before).toBeGreaterThanOrEqual(25000);
    expect(s.stats.jackpots).toBe(1);
  });

  it('ball save returns a drained ball to the plunger', () => {
    const s = create('normal');
    s.saveT = 5;
    place(s, 125, 470, 0, 300);
    frames(s, 30);
    expect(inPlay(s)[0].inLane).toBe(true);
    expect(s.ball).toBe(1);
  });

  it('draining the last ball counts the bonus and serves the next; the game ends after the last', () => {
    const s = create('normal');
    s.counts.bumpers = 40;
    s.mult = 2;
    place(s, 125, 470, 0, 300);
    frames(s, 30);
    expect(s.bonusT).toBeGreaterThan(0);
    frames(s, 200);
    expect(s.ball).toBe(2);
    expect(s.score).toBe(40 * 25 * 2);
    expect(s.mult).toBe(1);
    for (let k = 0; k < 2; k++) {
      place(s, 125, 470, 0, 300);
      frames(s, 260);
    }
    expect(s.over).toBe(true);
  });

  it('nudging too much tilts: flippers die and the bonus is lost', () => {
    const s = create('normal');
    place(s, 125, 200);
    for (let i = 0; i < 5; i++) nudge(s, 1);
    expect(s.tilted).toBe(true);
    update(s, 1 / 60, inputWith(['left']));
    expect(s.flippers[0].held).toBe(false);
  });

  it('a finger on each half of the table works both flippers', () => {
    const s = create('normal');
    place(s, 125, 200);
    const input = emptyInput();
    input.touches = [
      { id: 1, x: 40, y: 400 },
      { id: 2, x: 230, y: 400 },
    ];
    update(s, 1 / 60, input);
    expect(s.flippers[0].held && s.flippers[1].held).toBe(true);
  });

  it('easy gives more balls and a longer ball save than hard', () => {
    expect(create('easy').ballsLeft).toBeGreaterThan(create('hard').ballsLeft);
    expect(create('easy').set.save).toBeGreaterThan(create('hard').set.save);
  });
});
