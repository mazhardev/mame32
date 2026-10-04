import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'airport-manager',
  title: 'Airport Manager',
  category: 'strategy',
  difficulty: 'medium',
  icon: '✈️',
  tags: ['airport', 'planes', 'air traffic', 'time management', 'scheduling', 'upgrades'],
  short:
    'Land circling planes, park them at gates and clear them for take-off before fuel runs low.',
  full: 'Run the control tower of a small, busy airport for five days. Planes arrive and circle with limited fuel; clear them to land on a free runway, send them to a gate (jumbos need the big one), and once they have turned around, clear them for take-off. Every flight pays when it leaves, minus a penalty for keeping it waiting, and a plane that runs low on fuel diverts elsewhere. Spend your earnings on a second runway, more gates and a faster ground crew to keep up with growing traffic.',
  minutes: 12,
  hasSaveState: true,
  hasLevels: true,
  controls: {
    keyboard: ['R and T use runway 1 and 2', '1–5 use a gate', 'Esc clears the selection'],
    mouse: [
      'Click a plane, then a runway or gate — or click a free runway or gate to handle the most urgent plane',
    ],
    touch: [
      'Tap a plane, then a runway or gate — or tap a free runway or gate to handle the most urgent plane',
    ],
  },
  instructions: {
    objective: 'Earn each day’s target for five days.',
    howToPlay: [
      'Circling planes (top) need a free runway to land. Their bar shows the fuel left.',
      'Landed planes wait on the taxiway for a gate. Jumbos only fit gates marked JUMBO.',
      'At the gate a plane boards; when it says Ready, it needs a runway to take off.',
      'Tap a free runway or gate with nothing selected and the most urgent plane goes there.',
      'Between days, spend your cash on upgrades.',
    ],
    scoring:
      'Props pay 40, jets 70 and jumbos 120 on departure. After 8 seconds of waiting in total, each extra second costs 2 coins. A diversion costs 30.',
    difficultyNotes:
      'Easy: fewer planes with plenty of fuel. Normal: busier skies. Hard: a plane every few seconds and very little fuel to spare.',
    tips: [
      'Runways are the bottleneck — buy the second runway early.',
      'Clear ready planes for take-off to free gates, but never let a low-fuel plane wait.',
      'Blinking planes are almost out of fuel.',
      'Keep the jumbo gate free for jumbos when you can.',
    ],
    touchNotes: ['All planes, runways and gates are large tap targets.'],
  },
  achievements: [
    ['first', 'Cleared for Take-off', 'Handle your first flight.', 1, '🛫', 5],
    ['safe', 'Safe Skies', 'Hit a day’s target with no diversions.', 1, '🛬', 20],
    ['busy', 'Rush Hour', 'Handle 30 flights in one day.', 30, '🕐', 25],
    ['upgrades', 'International Hub', 'Build all four upgrades.', 4, '🏗️', 20],
    ['win', 'Air Traffic Ace', 'Complete all five days.', 1, '🏅', 30],
    ['hard', 'Tower Legend', 'Complete all five days on Hard.', 1, '🏆', 40],
    ['flights', 'Frequent Flyer', 'Handle 500 flights in total.', 500, '🌍', 25],
  ],
  load: () => import('./AirportGame'),
});
