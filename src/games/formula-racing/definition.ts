import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'formula-racing',
  title: 'Formula Racing',
  category: 'racing',
  difficulty: 'hard',
  icon: '🏁',
  tags: ['laps', 'track', 'speed', 'ai', 'racing'],
  short: 'Five laps of a grand prix in a fast single-seater — use the slipstream to overtake.',
  full: 'High-speed single-seater racing against five rivals on a long grand-prix circuit. These cars are fast and grippy, with brakes to match, so carry speed through the sweepers and brake hard and late for the hairpins. Tuck in close behind a rival on the straights to catch their slipstream for an extra burst of speed.',
  minutes: 6,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['↑ accelerate, ↓ brake', '← → steer'],
    mouse: ['Hold the button: the car drives towards the pointer'],
    touch: ['Direction pad, or hold the screen to drive towards your finger'],
  },
  instructions: {
    objective: 'Win the five-lap grand prix.',
    howToPlay: [
      'Six cars start on a two-by-two grid.',
      'Follow close behind a car on a straight to get the slipstream boost.',
      'Running wide onto the grass costs a lot of speed.',
      'The race ends when you complete lap five.',
    ],
    scoring: '1st 1,500, 2nd 1,000, 3rd 700, 4th 500, 5th 300, 6th 150.',
    difficultyNotes: 'Higher difficulty gives rivals more top speed and sharper driving.',
    tips: ['Use the slipstream to pull alongside, then brake later than your rival into the bend.', 'Smooth steering is faster than sharp corrections at these speeds.'],
    touchNotes: ['Holding the screen drives towards your finger; let go to coast.'],
  },
  achievements: [
    ['podium', 'Podium Finish', 'Finish in the top three.', 1, '🥉', 15],
    ['win', 'Grand Prix Winner', 'Win a grand prix.', 1, '🏁', 25],
    ['hard', 'World Champion', 'Win on Hard.', 1, '🏆', 40],
    ['races', 'Full Season', 'Complete 15 grand prix races.', 15, '🎖️', 25],
  ],
  load: () => import('./FormulaRacingGame'),
});
