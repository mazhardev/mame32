import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'circle-jump',
  title: 'Circle Jump',
  category: 'casual',
  difficulty: 'hard',
  icon: '⭕',
  tags: ['timing', 'rotation', 'one button', 'endless', 'casual'],
  short: 'Orbit a ring, then fling yourself off at just the right moment to catch the next one.',
  full: 'A hypnotic one-tap timing game. Your ball circles a ring. Tap and it flies off in a straight line along its orbit. If that line crosses the next ring, the ball is caught and starts orbiting again; if not, it drifts away into space. Rings get smaller and spin faster the higher you go, and some spin the other way.',
  minutes: 2,
  controls: {
    keyboard: ['Space or Enter launches the ball'],
    mouse: ['Click to launch'],
    touch: ['Tap to launch'],
  },
  instructions: {
    objective: 'Jump from ring to ring for as long as you can.',
    howToPlay: [
      'The ball orbits the ring it is on.',
      'Tap to release it; it flies straight along the direction it was moving.',
      'Reach the next ring to be caught. Missing every ring ends the game.',
      'Watch each ring’s direction: some orbit clockwise, others anticlockwise.',
    ],
    scoring: 'One point per ring reached, doubled when the flight line passes close to the ring’s centre. Skipping a ring scores for every ring passed.',
    difficultyNotes: 'Higher difficulty spins the rings faster.',
    tips: ['Release a little before the ball points at the next ring; the ball is on the edge of its orbit, not the centre.', 'Count a full rotation before your first jump to get the rhythm.'],
  },
  achievements: [
    ['jumps-10', 'Orbiter', 'Reach 10 rings in one game.', 10, '⭕', 15],
    ['jumps-40', 'Slingshot', 'Reach 40 rings in one game.', 40, '🏆', 30],
    ['perfect-10', 'Bullseye Orbit', 'Make 10 perfect jumps in one game.', 10, '⭐', 20],
    ['total', 'Space Traveller', 'Reach 500 rings in total.', 500, '🎖️', 30],
  ],
  load: () => import('./CircleJumpGame'),
});
