import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'lunar-lander',
  title: 'Lunar Lander',
  category: 'arcade',
  difficulty: 'hard',
  icon: '🌙',
  tags: ['space', 'physics', 'landing', 'skill', 'classic'],
  short: 'Fire the thruster, fight the gravity, and touch down gently on a landing pad.',
  full: 'A classic physics challenge. Your lander drifts over a rocky moonscape: rotate it and fire the main engine to control your descent, then set it down slowly and level on a flat green pad. Narrow pads are worth more. Fuel is precious — you get a little back with each landing — and a single hard touchdown ends the mission.',
  minutes: 4,
  controls: {
    keyboard: ['← / → rotate the lander', '↑ or Space fire the engine'],
    touch: ['Use the ◀ ▶ pad to rotate', 'Hold Thrust to fire the engine'],
  },
  instructions: {
    objective: 'Make as many safe landings as possible.',
    howToPlay: [
      'Gravity always pulls you down; the engine pushes in the direction the lander points.',
      'To land safely you must be over a green pad, moving slowly (both speeds green) and nearly upright.',
      'Narrower pads have bigger multipliers (×2, ×3 or ×5).',
      'After each landing a new moonscape appears and you get some fuel back.',
    ],
    scoring: '50 × the pad multiplier per landing, plus a fuel bonus and +50 for an extra-gentle touchdown.',
    difficultyNotes: 'Easy: weak gravity and plenty of fuel. Hard: strong gravity and little fuel.',
    tips: ['Kill your sideways speed high up, then descend.', 'Short, frequent bursts use less fuel than long burns.'],
    touchNotes: ['Rotate with the pad on the left, hold Thrust on the right.'],
  },
  achievements: [
    ['first', 'The Eagle Has Landed', 'Make your first safe landing.', 1, '🌙', 10],
    ['five', 'Frequent Lander', 'Make 5 landings in one mission.', 5, '🛰️', 30],
    ['perfect', 'Feather Touch', 'Make 3 perfect (extra-gentle) landings in one mission.', 3, '🪶', 30],
    ['total', 'Moon Base', 'Make 50 landings in total.', 50, '🏗️', 30],
  ],
  load: () => import('./LunarLanderGame'),
});
