import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'spot-the-difference',
  title: 'Spot the Difference',
  category: 'puzzle',
  difficulty: 'easy',
  icon: '🔍',
  tags: ['observation', 'visual', 'pictures', 'timed', 'relaxing'],
  short: 'Two pictures, a handful of changes. Find them all before the clock runs out.',
  full: 'Compare two cheerful, freshly drawn scenes side by side and find every difference: something missing, something added, a new colour, a different size or a mirror image. Tap a difference in either picture to circle it. Every scene is generated new, so you will never see the same pair twice.',
  minutes: 3,
  controls: {
    mouse: ['Click a difference in either picture'],
    touch: ['Tap a difference in either picture'],
    keyboard: ['Use the Hint button to reveal a difference'],
  },
  instructions: {
    objective: 'Find every difference between the two pictures before time runs out.',
    howToPlay: [
      'Look closely: objects can be missing, added, recoloured, bigger or smaller, or flipped the other way.',
      'Tap the spot in either picture; found differences are circled in both.',
      'A wrong tap costs 5 seconds. A hint circles one difference but costs 10 seconds.',
    ],
    scoring: '150 points per difference, plus 5 per second left if you find them all, minus 25 per wrong tap and 100 per hint.',
    difficultyNotes: 'Easy: 5 differences, 2 minutes. Normal: 7 differences, 2½ minutes. Hard: 9 subtler differences among more objects, 3 minutes.',
    tips: [
      'Scan the pictures in the same order — left to right, top to bottom.',
      'Check colours first, then count objects, then look at sizes and directions.',
    ],
    touchNotes: ['On a phone the pictures stack; compare them by scrolling a little between them.'],
  },
  achievements: [
    ['first', 'Keen Eye', 'Find every difference in a picture.', 1, '🔍', 10],
    ['eagle', 'Eagle Eye', 'Find them all without a wrong tap.', 1, '🦅', 25],
    ['fast', 'Quick Look', 'Find them all with half the time left.', 1, '⚡', 20],
    ['hard', 'Detective', 'Find every difference on Hard.', 1, '🕵️', 30],
    ['ten', 'Observer', 'Complete 10 pictures.', 10, '👀', 30],
  ],
  load: () => import('./SpotDifferenceGame'),
});
