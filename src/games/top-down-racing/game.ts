import { CAR } from '../_shared/racing/car';
import { makeLapRaceSpec } from '../_shared/racing/lapRace';
import { ROAD_LOOK } from '../_shared/racing/race';
import { COUNTRY_LOOP } from '../_shared/racing/tracks';

/** Top Down Car Racing: three laps of a country circuit against three rivals. */
export const config = {
  id: 'top-down-racing',
  tracks: [{ name: 'Country Loop', points: COUNTRY_LOOP, width: 120 }],
  laps: 3,
  rivals: [
    { name: 'Rosa', color: '#ef4444' },
    { name: 'Kai', color: '#22c55e' },
    { name: 'Milo', color: '#a855f7' },
  ],
  playerColor: '#2563eb',
  player: CAR,
  ai: {
    easy: { ...CAR, maxSpeed: 270 },
    normal: { ...CAR, maxSpeed: 305 },
    hard: { ...CAR, maxSpeed: 335 },
  },
  skill: { easy: 0.3, normal: 0.55, hard: 0.85 },
  look: ROAD_LOOK,
  points: [1000, 600, 400, 200],
  startHint: '↑ accelerate, ↓ brake, ← → steer, Space for a handbrake drift. Or hold the screen to drive towards your finger.',
};

export const spec = makeLapRaceSpec(config);
