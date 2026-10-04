import { CAR } from '../_shared/racing/car';
import type { CarParams } from '../_shared/racing/car';
import { makeLapRaceSpec } from '../_shared/racing/lapRace';
import { ROAD_LOOK } from '../_shared/racing/race';
import { FOREST_ESSES, HARBOUR, MOUNTAIN_PASS } from '../_shared/racing/tracks';

/** Circuit Racing: a sports car on one of three technical circuits, four laps. */
const SPORTS: CarParams = { ...CAR, accel: 290, maxSpeed: 360, grip: 9 };

export const config = {
  id: 'circuit-racing',
  tracks: [
    { name: 'Harbour Hairpins', points: HARBOUR, width: 110 },
    { name: 'Forest Esses', points: FOREST_ESSES, width: 115 },
    { name: 'Mountain Pass', points: MOUNTAIN_PASS, width: 110 },
  ],
  laps: 4,
  rivals: [
    { name: 'Ines', color: '#ef4444' },
    { name: 'Theo', color: '#f97316' },
    { name: 'Noor', color: '#14b8a6' },
  ],
  playerColor: '#2563eb',
  player: SPORTS,
  ai: {
    easy: { ...SPORTS, maxSpeed: 290 },
    normal: { ...SPORTS, maxSpeed: 330 },
    hard: { ...SPORTS, maxSpeed: 365 },
  },
  skill: { easy: 0.35, normal: 0.6, hard: 0.9 },
  look: { ...ROAD_LOOK, ground: '#57534e', edgeAlt: '#2563eb' },
  points: [1200, 800, 500, 250],
  chooseTrack: (random: () => number) => Math.floor(random() * 3),
  startHint: 'A random circuit each race. ↑ accelerate, ↓ brake, ← → steer, Space to slide round hairpins.',
};

export const spec = makeLapRaceSpec(config);
