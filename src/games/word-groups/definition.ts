import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'word-groups',
  title: 'Word Groups',
  category: 'word',
  difficulty: 'medium',
  icon: '🧩',
  tags: ['words', 'groups', 'daily', 'connections', 'brain', 'vocabulary'],
  short: 'Sixteen words, four hidden groups of four. Find the links before your four mistakes run out.',
  full: 'Sort sixteen words into four groups of four, in the style of the word-linking puzzles everyone shares each day. Some links are plain, like shades of blue; others are sneaky, like words that hide a body part or come before "fish". Watch for red herrings: a word may seem to belong in two groups, but only one way of splitting all sixteen works. Pick four words and submit. A wrong guess costs one of four mistakes, and three right out of four earns a hint that you are one away. Thirty original puzzles, a different one featured each day. For more word puzzles try [Categories](game:categories-game) and [Hive Words](game:hive-words), or see all [word guessing games](hub:word-guessing-games).',
  minutes: 5,
  hasSaveState: true,
  difficultyPicker: 'none',
  controls: {
    keyboard: ['Tab to a word and press Space to select it', 'Tab to Submit and press Enter'],
    mouse: ['Click four words, then Submit'],
    touch: ['Tap four words, then Submit'],
  },
  instructions: {
    objective: 'Find all four groups of four words before making four mistakes.',
    howToPlay: [
      'Select four words you think share a link and press Submit.',
      'A correct group is revealed in its colour: yellow is the easiest, then green, blue and purple, the trickiest.',
      'A wrong group costs one mistake. "One away" means three of your four words belong together.',
      'Each word belongs to exactly one group, even if it seems to fit two.',
      'Shuffle moves the words around to help you see new links. A different puzzle is featured each day, and you can play any of the thirty.',
    ],
    scoring: '100 points per group, plus 50 for each step of difficulty, minus 50 per mistake, and 200 extra for a perfect solve.',
    difficultyNotes: 'Every puzzle has one plain group and one sneaky purple group, usually wordplay.',
    tips: [
      'Look for the word that fits two groups first: the other words decide where it goes.',
      'Wordplay groups often hide words inside words, or words that go before or after another word.',
      'Solve the group you are surest of first to shrink the board.',
    ],
    touchNotes: ['Tap a word again to deselect it. Deselect clears your whole pick.'],
  },
  achievements: [
    ['first', 'Linked Up', 'Solve your first puzzle.', 1, '🧩', 10],
    ['perfect', 'Flawless Links', 'Solve a puzzle without a mistake.', 1, '✨', 30],
    ['purple', 'Purple First', 'Find the trickiest (purple) group first and go on to solve the puzzle.', 1, '🟣', 30],
    ['ten', 'Group Thinker', 'Solve 10 puzzles.', 10, '🏅', 40],
  ],
  load: () => import('./WordGroupsGame'),
});
