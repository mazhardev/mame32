import type { CarParams } from '../_shared/racing/car';
import { makeLapRaceSpec } from '../_shared/racing/lapRace';
import type { LapRaceState } from '../_shared/racing/lapRace';
import { LAGOON } from '../_shared/racing/tracks';

/**
 * Boat Racing: powerboats on a lagoon course marked by buoys. Boats carry
 * their momentum and slide wide through turns, so brake early.
 */
const BOAT: CarParams = { accel: 190, brake: 220, maxSpeed: 290, reverseSpeed: 60, grip: 2.6, turn: 2.2, drag: 0.45 };

export const config = {
  id: 'boat-racing',
  tracks: [{ name: 'Lagoon Run', points: LAGOON, width: 150 }],
  laps: 3,
  rivals: [
    { name: 'Marlin', color: '#f97316' },
    { name: 'Coral', color: '#ec4899' },
    { name: 'Tide', color: '#eab308' },
  ],
  playerColor: '#f8fafc',
  player: BOAT,
  ai: {
    easy: { ...BOAT, maxSpeed: 240 },
    normal: { ...BOAT, maxSpeed: 268 },
    hard: { ...BOAT, maxSpeed: 295 },
  },
  skill: { easy: 0.3, normal: 0.55, hard: 0.85 },
  look: { ground: '#0e7490', road: '#0891b2', edge: '#f97316', edgeAlt: '#fde047', buoys: true },
  points: [1000, 600, 400, 200],
  unit: 'knots',
  drawExtra(ctx: CanvasRenderingContext2D, s: LapRaceState) {
    // Foamy wakes behind every boat.
    for (const r of s.core.racers) {
      const c = r.car;
      const v = Math.hypot(c.vx, c.vy);
      if (v < 40) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(c.x - Math.cos(c.angle) * 12, c.y - Math.sin(c.angle) * 12);
        ctx.lineTo(c.x - Math.cos(c.angle + side * 0.35) * (20 + v * 0.12), c.y - Math.sin(c.angle + side * 0.35) * (20 + v * 0.12));
        ctx.stroke();
      }
    }
  },
  startHint: '↑ throttle, ↓ reverse, ← → steer. Boats slide — start turning early. Or hold the screen to steer towards your finger.',
};

export const spec = makeLapRaceSpec(config);
