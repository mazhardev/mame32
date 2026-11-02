import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { botPlay } from './bot';
import { create, fire, segments, step, swap, update } from './engine';
import type { Marble, State } from './engine';
import { D, LEVELS, TRACKS, at, track } from './paths';

function rng(seed: number) {
  let v = seed >>> 0;
  return () => ((v = (v * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** A level with a hand-made chain and nothing more to come. */
function setup(colors: number[], front = 600): State {
  const s = create('normal', 0, 1);
  s.toCome = 0;
  s.rushing = false;
  s.phase = 'play';
  s.speed = 0;
  s.chain = colors.map((c, i): Marble => ({ c, s: front - i * D, vs: front - i * D, power: 'none', id: 100 + i }));
  return s;
}

/** Fires the loaded marble straight at chain marble j. */
function shootAt(s: State, j: number, color: number) {
  s.load = color;
  const [x, y] = at(s.track, s.chain[j].s);
  s.aim = Math.atan2(y - s.track.sy, x - s.track.sx);
  fire(s);
  for (let k = 0; k < 90 && s.shots.length; k++) step(s, 1 / 60);
}

describe('tracks', () => {
  it('no track passes close to itself or to the shooter', () => {
    for (let i = 0; i < TRACKS.length; i++) {
      const t = track(i);
      for (let a = 0; a < t.length; a += 4) {
        expect(Math.hypot(t.xs[a] - t.sx, t.ys[a] - t.sy), `track ${i}`).toBeGreaterThan(40);
        for (let b = a + 80; b < t.length; b += 4) expect(Math.hypot(t.xs[a] - t.xs[b], t.ys[a] - t.ys[b]), `track ${i}`).toBeGreaterThan(D + 8);
      }
    }
  });

  it('has 15 levels getting faster and more colourful', () => {
    expect(LEVELS).toHaveLength(15);
    expect(LEVELS[14].speed).toBeGreaterThan(LEVELS[0].speed);
    expect(LEVELS[14].colors).toBeGreaterThan(LEVELS[0].colors);
  });
});

describe('matching', () => {
  it('a shot making three of a colour clears them', () => {
    // Front: red red blue green …
    const s = setup([0, 0, 1, 2, 3, 1, 2]);
    shootAt(s, 1, 0);
    expect(s.chain.map((m) => m.c)).toEqual([1, 2, 3, 1, 2]);
    expect(s.score).toBe(30);
  });

  it('a shot that makes no match joins the chain and pushes the front along', () => {
    const s = setup([0, 1, 2, 3]);
    const front = s.chain[0].s;
    shootAt(s, 2, 0);
    expect(s.chain).toHaveLength(5);
    expect(s.chain[0].s).toBeGreaterThan(front);
    for (let i = 1; i < s.chain.length; i++) expect(s.chain[i - 1].s - s.chain[i].s).toBeGreaterThanOrEqual(D - 0.01);
  });

  it('a gap with matching ends closes and sets off a combo', () => {
    // blue blue | red red | blue: clearing the reds pulls the blues together.
    const s = setup([1, 1, 0, 0, 1, 2, 3]);
    shootAt(s, 2, 0);
    for (let k = 0; k < 120; k++) step(s, 1 / 60);
    expect(s.chain.map((m) => m.c)).toEqual([2, 3]);
    expect(s.stats.bestCombo).toBeGreaterThanOrEqual(2);
  });

  it('a gap with different colours either side stays open', () => {
    const s = setup([1, 2, 0, 0, 3, 2]);
    shootAt(s, 2, 0);
    for (let k = 0; k < 60; k++) step(s, 1 / 60);
    expect(segments(s.chain)).toHaveLength(2);
  });

  it('a bomb marble takes its neighbours with it', () => {
    const s = setup([3, 0, 0, 2, 1, 2, 1, 3]);
    s.chain[1].power = 'bomb';
    shootAt(s, 1, 0);
    expect(s.chain.length).toBeLessThan(5);
    expect(s.stats.powers).toBe(1);
  });
});

describe('the shooter', () => {
  it('only loads colours still on the track, and can swap', () => {
    const s = setup([2, 2, 3, 3, 2, 3]);
    for (let i = 0; i < 6; i++) {
      s.cool = 0;
      fire(s);
      expect([2, 3]).toContain(s.load);
      s.shots = [];
    }
    const [a, b] = [s.load, s.next];
    swap(s);
    expect([s.load, s.next]).toEqual([b, a]);
  });

  it('a tap aims and fires there; tapping the idol swaps', () => {
    const s = setup([0, 1, 2]);
    update(s, 1 / 60, inputWith([], [], { x: 100, y: 40, down: true, pressed: true, active: true }));
    expect(s.shots).toHaveLength(1);
    expect(s.aim).toBeCloseTo(Math.atan2(40 - s.track.sy, 100 - s.track.sx), 5);
    const [a, b] = [s.load, s.next];
    update(s, 0.3, inputWith([], [], { x: s.track.sx, y: s.track.sy, down: true, pressed: true, active: true }));
    expect([s.load, s.next]).toEqual([b, a]);
    update(s, 1 / 60, emptyInput());
  });
});

describe('levels', () => {
  it('the chain reaching the pit costs a life and restarts the level', () => {
    const s = setup([0, 1, 2], track(0).length - 4);
    s.speed = 40;
    for (let k = 0; k < 60 * 4; k++) step(s, 1 / 60);
    expect(s.lives).toBe(2);
    expect(s.level).toBe(0);
    expect(s.toCome).toBeGreaterThan(0);
  });

  it('clearing the track moves on to the next level', () => {
    const s = setup([0, 0]);
    shootAt(s, 0, 0);
    for (let k = 0; k < 120; k++) step(s, 1 / 60);
    expect(s.level).toBe(1);
    expect(s.stats.levelsWon).toBe(1);
  });

  it('a good player can clear every level on Normal', () => {
    const r = rng(3);
    for (let i = 0; i < LEVELS.length; i++) {
      let wins = 0;
      for (let k = 0; k < 2; k++) {
        const s = create('normal', i, 500 + i * 7 + k);
        s.lives = 1;
        botPlay(s, 0.85, r, 1, 600);
        if (s.stats.levelsWon) wins++;
      }
      expect(wins, `level ${i + 1}`).toBeGreaterThanOrEqual(1);
    }
  }, 120_000);

  it('a careless player is beaten by the later levels', () => {
    const r = rng(8);
    const s = create('normal', 12, 99);
    s.lives = 1;
    botPlay(s, 0.3, r, 1, 600);
    expect(s.stats.levelsWon).toBe(0);
  }, 60_000);
});
