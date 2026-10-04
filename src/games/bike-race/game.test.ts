import { describe, expect, it } from 'vitest';
import { emptyInput } from '../_shared/arcade/kit';
import { STAGES, buildTrack } from './track';
import { create, ride, spec } from './game';

/** A steady rider: full throttle, leaning to keep the bike parallel to the ground. */
function autoRide(s: ReturnType<typeof create>, seconds: number) {
  for (let i = 0; i < seconds * 60 && !s.over; i++) {
    s.time += 1 / 60;
    if (s.phase === 'ride' && !s.bike.crashed) {
      const g = s.track.ground;
      const target = Math.atan((g(s.bike.x + 20) - g(s.bike.x - 20)) / 40);
      const err = s.bike.a - target;
      const lean = Math.max(-1, Math.min(1, -err * 3 - s.bike.w * 0.6));
      ride(s, 1 / 60, s.bike.vx > 330 ? 0 : 1, lean);
      s.stageTime += 1 / 60;
      spec.update(s, 0, emptyInput(), Math.random);
    } else spec.update(s, 1 / 60, emptyInput(), Math.random);
  }
}

describe('bike race', () => {
  it('builds continuous stages with checkpoints', () => {
    for (let n = 0; n < STAGES; n++) {
      const t = buildTrack(n);
      expect(t.length).toBeGreaterThan(4000);
      expect(t.checkpoints.length).toBeGreaterThan(1);
      for (let x = 0; x < t.length; x += 7)
        expect(Math.abs(t.ground(x + 1) - t.ground(x))).toBeLessThan(3);
    }
  });

  it('a careful rider can finish all three stages', () => {
    const s = create('normal');
    autoRide(s, 400);
    expect(s.over).toBe(true);
    expect(s.times).toHaveLength(STAGES);
  });

  it('crashing returns you to the last checkpoint', () => {
    const s = create('normal');
    s.checkpoint = 1580;
    s.bike.crashed = true;
    for (let i = 0; i < 90; i++) spec.update(s, 1 / 60, emptyInput(), Math.random);
    expect(s.bike.crashed).toBe(false);
    expect(s.bike.x).toBe(1580);
  });
});
