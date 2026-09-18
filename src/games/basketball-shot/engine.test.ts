import { describe, expect, it } from 'vitest';
import { BasketballEngine, DIFFICULTY_CONFIG, MAX_ANGLE, MIN_ANGLE } from './engine';
import { OscillatingMeter } from '../_shared/sports/physics';

function simulate(engine: BasketballEngine, maxSeconds = 8) {
  const events: string[] = [];
  for (let t = 0; t < maxSeconds && engine.phase === 'flying'; t += 1 / 60) {
    events.push(...engine.update(1 / 60));
  }
  return events;
}

/** Brute-force an aim that scores from the engine's current spot. */
function findScoringAim(x: number) {
  for (let a = 30; a <= 80; a += 1) {
    for (let p = 0; p <= 1; p += 0.01) {
      const probe = new BasketballEngine({ ...DIFFICULTY_CONFIG.normal, roundSeconds: 999 }, 1);
      probe.placeAt(x);
      probe.setAim((a * Math.PI) / 180, p);
      probe.shoot();
      if (simulate(probe).includes('score')) return { angle: (a * Math.PI) / 180, power: p };
    }
  }
  return null;
}

describe('BasketballEngine', () => {
  it('starts aiming with a full clock and no score', () => {
    const e = new BasketballEngine(DIFFICULTY_CONFIG.normal, 7);
    expect(e.phase).toBe('aiming');
    expect(e.timeLeft).toBe(60);
    expect(e.score).toBe(0);
  });

  it('difficulty changes the round length and the aiming guide', () => {
    expect(DIFFICULTY_CONFIG.easy.roundSeconds).toBeGreaterThan(
      DIFFICULTY_CONFIG.hard.roundSeconds,
    );
    expect(new BasketballEngine(DIFFICULTY_CONFIG.easy, 1).trajectory().length).toBeGreaterThan(0);
    expect(new BasketballEngine(DIFFICULTY_CONFIG.hard, 1).trajectory()).toHaveLength(0);
  });

  it('clamps aim to the legal range', () => {
    const e = new BasketballEngine(DIFFICULTY_CONFIG.normal, 1);
    e.setAim(-1, 5);
    expect(e.angle).toBe(MIN_ANGLE);
    expect(e.power).toBe(1);
    e.setAim(3, -2);
    expect(e.angle).toBe(MAX_ANGLE);
    expect(e.power).toBe(0);
  });

  it('a well-aimed shot scores two points from inside the arc', () => {
    const aim = findScoringAim(260);
    expect(aim).not.toBeNull();
    const e = new BasketballEngine({ ...DIFFICULTY_CONFIG.normal, roundSeconds: 999 }, 1);
    e.placeAt(260);
    e.setAim(aim!.angle, aim!.power);
    expect(e.shoot()).toBe(true);
    const events = simulate(e);
    expect(events).toContain('score');
    expect(e.made).toBe(1);
    expect(e.attempts).toBe(1);
    expect(e.score).toBeGreaterThanOrEqual(2);
    expect(e.score).toBeLessThanOrEqual(3);
    expect(e.phase).toBe('aiming');
  });

  it('a long shot is worth three points', () => {
    const aim = findScoringAim(150);
    expect(aim).not.toBeNull();
    const e = new BasketballEngine({ ...DIFFICULTY_CONFIG.normal, roundSeconds: 999 }, 1);
    e.placeAt(150);
    e.setAim(aim!.angle, aim!.power);
    e.shoot();
    simulate(e);
    expect(e.threes).toBe(1);
    expect(e.score).toBeGreaterThanOrEqual(3);
  });

  it('a weak shot misses and breaks the streak', () => {
    const e = new BasketballEngine({ ...DIFFICULTY_CONFIG.normal, roundSeconds: 999 }, 1);
    e.streak = 2;
    e.setAim(Math.PI / 4, 0);
    e.shoot();
    const events = simulate(e);
    expect(events).toContain('miss');
    expect(e.score).toBe(0);
    expect(e.streak).toBe(0);
  });

  it('cannot shoot while the ball is in the air', () => {
    const e = new BasketballEngine(DIFFICULTY_CONFIG.normal, 1);
    expect(e.shoot()).toBe(true);
    expect(e.shoot()).toBe(false);
    expect(e.attempts).toBe(1);
  });

  it('ends the round when the clock runs out, but lets a shot in flight finish', () => {
    const e = new BasketballEngine({ ...DIFFICULTY_CONFIG.normal, roundSeconds: 0.5 }, 1);
    e.setAim(Math.PI / 3, 0.5);
    e.shoot();
    e.update(0.6);
    expect(e.phase).toBe('flying');
    simulate(e);
    expect(e.phase).toBe('over');
    expect(e.shoot()).toBe(false);
  });

  it('an idle round ends on time', () => {
    const e = new BasketballEngine({ ...DIFFICULTY_CONFIG.normal, roundSeconds: 1 }, 1);
    const events = [...e.update(0.6), ...e.update(0.6)];
    expect(events).toContain('end');
    expect(e.phase).toBe('over');
  });
});

describe('OscillatingMeter', () => {
  it('sweeps between 0 and 1 and reverses at the ends', () => {
    const m = new OscillatingMeter(2);
    m.update(0.4);
    expect(m.value).toBeCloseTo(0.8);
    m.update(0.2);
    expect(m.value).toBeCloseTo(0.8);
    m.update(0.4);
    expect(m.value).toBeCloseTo(0);
  });
});
