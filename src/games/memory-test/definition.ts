import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'memory-test',
  title: 'Memory Test',
  category: 'brain',
  difficulty: 'medium',
  icon: '🧩',
  tags: ['memory', 'visual', 'grid', 'brain'],
  short: 'Squares light up for a moment — tap the same ones. Each level adds another.',
  full: 'A visual memory test. A few squares on the grid light up briefly; when they go dark, tap the squares that were lit. Every level adds one more square to remember, and the grid itself grows as you progress. Three wrong taps in a level cost a life, and you have three lives.',
  minutes: 3,
  controls: {
    keyboard: ['Tab to a square, Enter or Space to choose it'],
    mouse: ['Click the squares'],
    touch: ['Tap the squares'],
  },
  instructions: {
    objective: 'Reach the highest level you can.',
    howToPlay: [
      'Press Start and watch which squares light up.',
      'When they turn off, tap every square that was lit, in any order.',
      'Find them all to move to the next level, which has one more square.',
      'Three wrong taps in a level cost a life. Lose all three lives and the test ends.',
    ],
    scoring: '100 points per level cleared.',
    difficultyNotes: 'The pattern is shown for 1.4 s on Easy, 1 s on Normal and 0.7 s on Hard.',
    tips: ['Look at the shape the squares make rather than each square.', 'Tap the squares you are sure of first.'],
  },
  achievements: [
    ['level-8', 'Photographic', 'Clear 8 levels.', 8, '📸', 15],
    ['level-15', 'Eidetic', 'Clear 15 levels.', 15, '🏆', 30],
    ['clean', 'Not a Slip', 'Clear a level from level 5 up with no mistakes.', 1, '✅', 15],
    ['squares', 'Grid Master', 'Clear 200 levels in total.', 200, '🎖️', 30],
  ],
  load: () => import('./MemoryTestGame'),
});
