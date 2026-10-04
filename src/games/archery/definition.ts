import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'archery',
  title: 'Archery',
  category: 'sports',
  difficulty: 'medium',
  icon: '🏹',
  tags: ['bow', 'target', 'wind', 'aim', 'ai', 'sports'],
  short: 'Shoot four ends at 30–90 m against a computer archer, allowing for wind and drop.',
  full: 'A target archery match on a ten-ring face. Shoot three arrows at each of 30, 50, 70 and 90 metres while a computer archer shoots the same ends. Your arrows fall further at long range and drift with the wind, so you must aim above and into it. Your bow arm wobbles as you draw, settles for a few seconds, then starts to tire — release while it is steady.',
  minutes: 5,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Arrow keys aim', 'Hold Space to draw, release to shoot'],
    mouse: ['Point to aim; hold the button to draw and release to shoot'],
    touch: ['Touch and hold to draw, slide to aim, lift to shoot'],
  },
  instructions: {
    objective: 'Score more than the computer over 12 arrows.',
    howToPlay: [
      'Rings score 10 (inner gold) down to 1 (outer white); outside the face is a miss.',
      'Your sight is set for 30 m. At longer distances the arrow drops, so aim higher.',
      'The flag shows the wind. Aim into it — the stronger the wind and the longer the distance, the more it pushes.',
      'Hold to draw: the sight wobbles at first, settles (green bar), then tires (red).',
    ],
    scoring: '10 points per ring scored, plus 300 for beating the computer.',
    difficultyNotes:
      'Easy: no wind, little sway, and a dashed mark shows exactly where to aim. Normal: a breeze, more sway, and the mark allows for drop only. Hard: strong wind, more sway, no aiming mark and a very accurate opponent.',
    tips: [
      'Release in the first second or two of the green window.',
      'At 90 m the drop is big — about two rings above the gold.',
    ],
    touchNotes: ['Your finger moves the aim slowly while drawing, for fine adjustment.'],
  },
  achievements: [
    ['ten', 'Gold!', 'Shoot a 10.', 1, '🎯', 10],
    ['win', 'Champion Archer', 'Beat the computer.', 1, '🏹', 20],
    ['perfect', 'Perfect End', 'Shoot three 10s in one end.', 1, '💯', 40],
    ['total', 'Century', 'Score 100 or more in a match.', 100, '🏅', 30],
    ['hard', 'Olympian', 'Win on Hard.', 1, '🏆', 40],
    ['rounds', 'Regular at the Range', 'Shoot 10 matches.', 10, '🎖️', 20],
  ],
  load: () => import('./ArcheryGame'),
});
