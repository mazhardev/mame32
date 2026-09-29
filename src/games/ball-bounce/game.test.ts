import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { BALL_R, BOUNCE, GRAVITY, SPRING, create, flightTime, generate, safeSpan, spec } from './game';
import type { Platform, State } from './game';

const rng = () => 0.5;

/** One long platform under the ball and nothing else. */
function floor(kind: Platform['kind'] = 'plain', spike?: [number, number]): State {
  const s = create('normal', rng);
  s.platforms = [{ x: 0, y: 250, w: 100000, kind, spike, used: true, gone: false }];
  s.gems = [];
  return s;
}

/**
 * Plays like a careful human: aims each bounce at the middle of the widest
 * safe part of the next platform, adjusting speed and slamming when needed.
 */
function autopilot(s: State): ReturnType<typeof emptyInput> {
  const input = emptyInput();
  const next = s.platforms.find((p) => !p.used && !p.gone);
  if (!next) return input;
  const span = safeSpan(next).sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0];
  const target = (span[0] + span[1]) / 2;
  const t = flightTime(-s.vy, s.y + BALL_R, next.y);
  if (!Number.isFinite(t) || t <= 0) return input;
  const need = (target - s.x) / t;
  if (need > s.vx + 4) input.held.add('right');
  else if (need < s.vx - 4) input.held.add('left');
  else if (Math.abs(need - (s.vmin + s.vmax) / 2) > 4) input.held.add(need > s.vx ? 'right' : 'left');
  if (s.x + s.vmin * t > span[1] - 6 && s.vy > 0) input.pressed.add('action');
  return input;
}

describe('ball bounce', () => {
  it('bounces to the same height every time', () => {
    const s = floor();
    let top = Infinity;
    for (let i = 0; i < 300; i++) {
      simulate(spec, s, 1 / 60, emptyInput(), rng);
      if (i > 60) top = Math.min(top, s.y);
    }
    // Within a few pixels of the ideal apex (the simulation steps in frames).
    expect(Math.abs(250 - BALL_R - top - (BOUNCE * BOUNCE) / (2 * GRAVITY))).toBeLessThan(8);
    expect(s.over).toBe(false);
  });

  it('springs launch the ball higher', () => {
    const s = floor('spring');
    let top = Infinity;
    for (let i = 0; i < 200; i++) {
      simulate(spec, s, 1 / 60, emptyInput(), rng);
      top = Math.min(top, s.y);
    }
    expect(250 - BALL_R - top).toBeGreaterThan(((BOUNCE * SPRING) ** 2 / (2 * GRAVITY)) * 0.9);
  });

  it('changes speed with the keys, within limits', () => {
    const fast = floor();
    simulate(spec, fast, 2, inputWith(['right']), rng);
    expect(fast.vx).toBeCloseTo(fast.vmax, 5);
    const slow = floor();
    simulate(spec, slow, 2, inputWith(['left']), rng);
    expect(slow.vx).toBeCloseTo(slow.vmin, 5);
  });

  it('slams straight down on demand', () => {
    const s = floor();
    simulate(spec, s, 0.2, emptyInput(), rng);
    simulate(spec, s, 1 / 60, inputWith([], ['action']), rng);
    expect(s.vy).toBeGreaterThan(900);
    expect(s.slammed).toBe(true);
  });

  it('pops the ball on spikes', () => {
    const s = floor('spike', [0, 100000]);
    s.platforms[0].x = -50000;
    s.platforms[0].spike = [0, 100000];
    simulate(spec, s, 2, emptyInput(), rng);
    expect(s.over).toBe(true);
    expect(s.cause).toBe('spiked');
  });

  it('crumbling ledges break after one bounce', () => {
    const s = floor('crumble');
    simulate(spec, s, 2, emptyInput(), rng);
    expect(s.platforms.some((p) => p.gone) || s.over).toBe(true);
  });

  it('ends when the ball falls off the bottom', () => {
    const s = create('normal', rng);
    // Nothing below the ball: the next platform is far ahead.
    s.platforms = [{ x: 5000, y: 250, w: 100, kind: 'plain', used: false, gone: false }];
    simulate(spec, s, 3, emptyInput(), rng);
    expect(s.over).toBe(true);
    expect(s.cause).toBe('fell');
  });

  it('generates spikes that always leave room to land', () => {
    const random = createRng('spikes').next;
    const s = create('hard', random);
    for (let i = 0; i < 400; i++) generate(s, random);
    expect(s.platforms.filter((p) => p.kind === 'spike').length).toBeGreaterThan(20);
    for (const p of s.platforms) for (const [a, b] of safeSpan(p)) expect(b - a).toBeGreaterThan(20);
  });

  for (const difficulty of ['easy', 'normal', 'hard'] as const)
    it(`can be played for a long run (${difficulty})`, () => {
      const random = createRng(`bounce-${difficulty}`).next;
      const s = create(difficulty, random);
      for (let i = 0; i < 90 * 60 && !s.over; i++) {
        s.time += 1 / 60;
        spec.update(s, 1 / 60, autopilot(s), random);
      }
      expect(s.over, `fell after ${s.landed} platforms (${s.cause})`).toBe(false);
      expect(s.landed).toBeGreaterThan(80);
    });

  it('computes flight times for level, higher and lower landings', () => {
    const level = flightTime(BOUNCE, 250, 250);
    expect(level).toBeCloseTo((2 * BOUNCE) / GRAVITY, 5);
    expect(flightTime(BOUNCE, 250, 200)).toBeLessThan(level);
    expect(flightTime(BOUNCE, 250, 300)).toBeGreaterThan(level);
  });
});
