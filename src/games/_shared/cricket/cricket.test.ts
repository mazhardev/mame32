import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import {
  BATTER,
  BOWLER,
  CONTACT_D,
  FIELD_CFG,
  PITCH,
  SWING_TIME,
  addOutcome,
  aiDelivery,
  aiShot,
  arrival,
  ballAt,
  hitsStumps,
  inningsOver,
  isWide,
  newInnings,
  resolveBall,
} from './cricket';
import type { Delivery } from './cricket';

const straight: Delivery = { kind: 'pace', speed: 33, releaseX: 0, length: 5, bounceX: 0, turn: 0 };
const perfect = (dl: Delivery) => arrival(dl, CONTACT_D) - SWING_TIME;

describe('delivery physics', () => {
  it('pitches at its length and reaches the stumps', () => {
    const tb = (PITCH - straight.length) / straight.speed;
    const before = ballAt(straight, tb - 1e-4);
    const after = ballAt(straight, tb + 1e-4);
    expect(before.z).toBeLessThan(0.05);
    expect(after.bounced).toBe(true);
    expect(ballAt(straight, arrival(straight, 0)).d).toBeCloseTo(0, 5);
    expect(ballAt(straight, 0).z).toBeCloseTo(2.1, 5);
  });

  it('a straight good-length ball would hit the stumps; a wide one would not', () => {
    expect(hitsStumps(straight)).toBe(true);
    const wide = { ...straight, bounceX: 1.4 };
    expect(hitsStumps(wide)).toBe(false);
    expect(isWide(wide)).toBe(true);
  });
});

describe('batting outcomes', () => {
  const cfg = FIELD_CFG.normal;
  it('missing a straight ball is bowled', () => {
    const o = resolveBall(
      straight,
      { swingAt: perfect(straight) + 0.5, dir: 0, lofted: false },
      cfg,
      () => 0.5,
    );
    expect(o.out).toBe('bowled');
  });

  it('a perfectly timed lofted shot is a six', () => {
    const o = resolveBall(
      straight,
      { swingAt: perfect(straight), dir: 0, lofted: true },
      cfg,
      () => 0.5,
    );
    expect(o.runs).toBe(6);
  });

  it('early contact goes to the leg side, late to the off side', () => {
    const early = resolveBall(
      straight,
      { swingAt: perfect(straight) - 0.05, dir: 0, lofted: false },
      cfg,
      () => 0.5,
    );
    const late = resolveBall(
      straight,
      { swingAt: perfect(straight) + 0.05, dir: 0, lofted: false },
      cfg,
      () => 0.5,
    );
    expect(early.angle).toBeLessThan(0);
    expect(late.angle).toBeGreaterThan(0);
  });

  it('leaving a wide ball concedes an extra and it is bowled again', () => {
    const o = resolveBall(
      { ...straight, bounceX: 1.5 },
      { swingAt: null, dir: 0, lofted: false },
      cfg,
      () => 0.5,
    );
    expect(o.rebowl).toBe(true);
    const inn = newInnings(1, 2);
    addOutcome(inn, o);
    expect(inn.runs).toBe(1);
    expect(inn.balls).toBe(0);
  });

  it('an innings ends on balls, wickets or reaching the target', () => {
    const inn = newInnings(1, 2, 10);
    addOutcome(inn, {
      runs: 6,
      extras: 0,
      out: null,
      rebowl: false,
      text: '',
      quality: 1,
      timing: 0,
      angle: 0,
      dist: 80,
      aerial: true,
      fielder: null,
    });
    expect(inningsOver(inn)).toBe(false);
    addOutcome(inn, {
      runs: 4,
      extras: 0,
      out: null,
      rebowl: false,
      text: '',
      quality: 1,
      timing: 0,
      angle: 0,
      dist: 70,
      aerial: false,
      fielder: null,
    });
    expect(inningsOver(inn)).toBe(true);
  });
});

describe('computer players', () => {
  function simulate(level: 'easy' | 'hard', bowlerLevel: 'easy' | 'hard') {
    const rng = createRng(42).next;
    let runs = 0;
    let outs = 0;
    let prev: Delivery | null = null;
    for (let i = 0; i < 600; i++) {
      const dl = aiDelivery(BOWLER[bowlerLevel], rng);
      const shot = aiShot(dl, prev, BATTER[level], FIELD_CFG.normal, 0.3, rng);
      const o = resolveBall(dl, shot, FIELD_CFG.normal, rng);
      runs += o.runs + o.extras;
      if (o.out) outs++;
      prev = dl;
    }
    return { runs, outs };
  }

  it('a stronger computer batter scores more and gets out less', () => {
    const weak = simulate('easy', 'easy');
    const strong = simulate('hard', 'easy');
    expect(strong.runs).toBeGreaterThan(weak.runs);
    expect(strong.outs).toBeLessThan(weak.outs);
  });

  it('a stronger computer bowler concedes fewer runs', () => {
    expect(simulate('hard', 'hard').runs).toBeLessThan(simulate('hard', 'easy').runs);
  });
});
