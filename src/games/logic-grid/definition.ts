import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'logic-grid',
  title: 'Logic Grid',
  category: 'brain',
  difficulty: 'hard',
  icon: '🧮',
  tags: ['deduction', 'logic', 'constraints', 'einstein', 'brain'],
  short: 'Use the clues to work out who owns what — an Einstein-style deduction puzzle.',
  full: 'A classic logic-grid puzzle. Each person has exactly one item from every category: a favourite colour, a pet, an age and so on. Read the clues, mark impossible pairs with a cross and certain ones with a tick, and deduce the full picture. Every puzzle is generated with exactly one solution and no unnecessary clues. Progress saves automatically.',
  minutes: 10,
  hasSaveState: true,
  controls: {
    keyboard: ['Tab through the grid, Enter or Space to mark a cell'],
    mouse: ['Click a cell once for ✗, twice for ✓, three times to clear; click a clue to strike it out'],
    touch: ['Tap a cell once for ✗, twice for ✓, three times to clear'],
  },
  instructions: {
    objective: 'Find the one arrangement that satisfies every clue.',
    howToPlay: [
      'Each row is a person; each column group is a category.',
      'Every person has exactly one item in each category, and no two people share an item.',
      'Mark ✗ where a clue rules a pair out and ✓ where you are certain.',
      '“Either A or B” means exactly one of them. “Older than” compares ages.',
      'The puzzle is solved as soon as every ✓ is in place.',
    ],
    scoring: 'Bigger puzzles score more; time and checks reduce the score.',
    difficultyNotes: 'Easy: 3 people, 2 categories. Normal: 4 people with ages. Hard: 5 people with ages.',
    tips: ['Start with the direct “is” clues.', 'When a row has only one blank left in a category, that blank must be ✓.', 'Strike out clues you have fully used.'],
    touchNotes: ['Scroll the grid sideways on narrow screens.'],
  },
  achievements: [
    ['first', 'Detective', 'Solve a logic grid.', 1, '🕵️', 10],
    ['clean', 'No Peeking', 'Solve a puzzle without using Check.', 1, '🔎', 20],
    ['hard', 'Master Sleuth', 'Solve a 5-person puzzle.', 1, '🏆', 30],
    ['solved', 'Case Files', 'Solve 25 puzzles.', 25, '🎖️', 30],
  ],
  load: () => import('./LogicGridGame'),
});
