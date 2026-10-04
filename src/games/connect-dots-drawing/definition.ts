import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'connect-dots-drawing',
  title: 'Connect-the-Dots Drawing',
  category: 'creative',
  difficulty: 'easy',
  icon: '📐',
  tags: ['dot to dot', 'drawing', 'kids', 'numbers', 'creative', 'relaxing'],
  short: 'Join the numbered dots in order to reveal five hidden pictures.',
  full: 'A classic dot-to-dot activity with original pictures. Tap the dots in number order — 1, 2, 3 — and a line follows your finger. When the last dot is joined, the details appear and the picture is revealed. Five pictures per game, with more dots on harder levels.',
  minutes: 4,
  controls: {
    keyboard: ['Tab to a dot and press Enter', 'Enter goes to the next picture'],
    mouse: ['Click the dots in order'],
    touch: ['Tap the dots in order'],
  },
  instructions: {
    objective: 'Connect every dot in order to reveal each picture.',
    howToPlay: [
      'Start at dot 1 and tap each next number.',
      'The next dot glows (on Easy and Normal).',
      'A wrong dot flashes red and counts as a wrong tap.',
      'After the last dot the picture is completed for you.',
    ],
    scoring: '200 points per picture, minus 20 per wrong tap and 2 per second.',
    difficultyNotes:
      'Easy has 12 dots per picture, Normal 20 and Hard 30, with no glow on the next dot.',
    tips: ['Look for the next number before you tap.', 'Numbers sit just outside their dots.'],
    touchNotes: ['Each dot has a generous tap area around it.'],
  },
  achievements: [
    ['first', 'Dot to Dot', 'Reveal five pictures in one game.', 1, '📐', 10],
    ['perfect', 'Sure Hand', 'Finish a game with no wrong taps.', 1, '✋', 20],
    ['pictures', 'Picture Book', 'Reveal 50 pictures in total.', 50, '📖', 25],
    ['hard', 'Dot Master', 'Finish a game on Hard.', 1, '🏆', 25],
  ],
  load: () => import('./ConnectDotsGame'),
});
