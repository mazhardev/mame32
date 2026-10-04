import { forwardSpeed } from '../_shared/racing/car';
import type { CarParams } from '../_shared/racing/car';
import { makeLapRaceSpec } from '../_shared/racing/lapRace';
import type { LapRaceState } from '../_shared/racing/lapRace';
import { ROAD_LOOK } from '../_shared/racing/race';
import { GRAND_PRIX } from '../_shared/racing/tracks';

/**
 * Formula Racing: a fast, grippy single-seater over five laps against five
 * rivals. Tuck in behind a rival for a slipstream speed boost.
 */
const F1: CarParams = { accel: 340, brake: 620, maxSpeed: 450, reverseSpeed: 80, grip: 12, turn: 2.6, drag: 0.28 };

/** True when the player is close behind another car and pointing the same way. */
export function inSlipstream(s: LapRaceState): boolean {
  const me = s.core.racers[s.core.racers.length - 1].car;
  return s.core.racers.slice(0, -1).some((r) => {
    const dx = r.car.x - me.x;
    const dy = r.car.y - me.y;
    const d = Math.hypot(dx, dy);
    if (d < 25 || d > 90) return false;
    const toward = Math.atan2(dy, dx);
    return Math.abs(Math.atan2(Math.sin(toward - me.angle), Math.cos(toward - me.angle))) < 0.25;
  });
}

export const config = {
  id: 'formula-racing',
  tracks: [{ name: 'Grand Prix Circuit', points: GRAND_PRIX, width: 130 }],
  laps: 5,
  rivals: [
    { name: 'Vega', color: '#ef4444' },
    { name: 'Okafor', color: '#f59e0b' },
    { name: 'Lind', color: '#22c55e' },
    { name: 'Sato', color: '#a855f7' },
    { name: 'Moreau', color: '#ec4899' },
  ],
  playerColor: '#2563eb',
  player: F1,
  ai: {
    easy: { ...F1, maxSpeed: 380 },
    normal: { ...F1, maxSpeed: 420 },
    hard: { ...F1, maxSpeed: 455 },
  },
  skill: { easy: 0.35, normal: 0.6, hard: 0.9 },
  look: { ...ROAD_LOOK, ground: '#3f6212' },
  points: [1500, 1000, 700, 500, 300, 150],
  afterUpdate(s: LapRaceState, dt: number) {
    if (s.core.countdown > 0) return;
    const me = s.core.racers[s.core.racers.length - 1].car;
    if (inSlipstream(s) && forwardSpeed(me) > 200) {
      // The tow: a little extra push along the heading.
      me.vx += Math.cos(me.angle) * 70 * dt;
      me.vy += Math.sin(me.angle) * 70 * dt;
      if (s.messageT <= 0) {
        s.message = 'Slipstream!';
        s.messageT = 0.4;
      }
    }
  },
  startHint: '↑ accelerate, ↓ brake, ← → steer. Follow close behind a rival to catch their slipstream.',
};

export const spec = makeLapRaceSpec(config);
