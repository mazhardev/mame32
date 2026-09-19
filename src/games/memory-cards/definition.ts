import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'memory-cards',
  title: 'Memory Cards',
  category: 'card',
  difficulty: 'easy',
  icon: '🧠',
  tags: ['cards', 'memory', 'pairs', 'concentration', 'kids', 'brain'],
  short: 'Turn over playing cards two at a time and match pairs of the same rank and colour.',
  full: 'The classic concentration game with a real deck. Every card has one partner of the same rank and colour — the 7♥ matches the 7♦, the K♠ matches the K♣. Flip two at a time, remember where everything is, and clear the table in as few moves as you can.',
  minutes: 4,
  multiplayer: 'single',
  hasLevels: true,
  controls: {
    keyboard: ['Tab to a card and press Enter to turn it over'],
    mouse: ['Click a card to turn it over'],
    touch: ['Tap a card to turn it over'],
  },
  instructions: {
    objective: 'Find every matching pair.',
    howToPlay: [
      'Turn over two cards. If they share a rank and colour, they stay found.',
      'If not, they turn back face down — remember them!',
      'A “slip” is counted when you had already seen a card’s partner but still missed it.',
    ],
    scoring: '60 points per pair, minus 25 per slip, plus a speed bonus.',
    difficultyNotes: 'Easy: 6 pairs. Normal: 10 pairs. Hard: 15 pairs.',
    tips: ['Work through the grid in a pattern so you remember positions.', 'Say the cards to yourself as you flip them.'],
  },
  achievements: [
    ['clear', 'Card Sharp', 'Clear a table.', 1, '🧠', 5],
    ['perfect', 'Total Recall', 'Clear a table with no slips.', 1, '💎', 20],
    ['big', 'Big Table', 'Clear the 15-pair table.', 1, '🏆', 20],
    ['fast', 'Quick Study', 'Clear a table in under 5 seconds per pair.', 1, '⚡', 25],
  ],
  load: () => import('./MemoryCardsGame'),
});
