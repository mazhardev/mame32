import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'pyramid-solitaire',
  title: 'Pyramid Solitaire',
  category: 'card',
  difficulty: 'easy',
  icon: '🔺',
  tags: ['solitaire', 'patience', 'cards', 'adding', 'matching', 'single player'],
  short: 'Clear the pyramid by pairing cards that add up to 13.',
  full: 'A classic adding solitaire. Twenty-eight cards form a pyramid; pair up any two uncovered cards that total 13 — a 6 with a 7, a Jack with a 2, a Queen with an Ace — and remove Kings on their own. Use the draw pile to find partners and clear the whole pyramid.',
  minutes: 6,
  multiplayer: 'single',
  controls: {
    keyboard: ['Tab to a card and press Enter to select it, then select its partner'],
    mouse: ['Click two cards that add up to 13; click a King to remove it; click the stock to draw'],
    touch: ['Tap two cards that add up to 13; tap a King to remove it; tap the stock to draw'],
  },
  instructions: {
    objective: 'Remove every card from the pyramid.',
    howToPlay: [
      'Cards count at face value; Jacks are 11, Queens 12, Aces 1. Kings (13) are removed on their own.',
      'Only cards not covered by another card can be used.',
      'Click the stock to turn a card onto the waste pile; the top waste card can be paired too.',
      'When the stock runs out you may turn the waste over again, if you have passes left.',
    ],
    scoring: '10 points per card removed; clearing the pyramid adds 500, plus 150 for each unused pass.',
    difficultyNotes: 'Easy: three passes through the stock. Normal: two. Hard: just one.',
    tips: ['Look ahead: removing a pair can uncover the partner you need.', 'Don’t rush to use the waste if a pyramid pair is available.'],
  },
  achievements: [
    ['win', 'Pharaoh', 'Clear the pyramid.', 1, '🔺', 15],
    ['onepass', 'One Pass', 'Clear the pyramid on your first pass through the stock.', 1, '🏆', 30],
    ['cards', 'Stonemason', 'Remove 40 cards in one game.', 40, '🧱', 10],
  ],
  load: () => import('./PyramidGame'),
});
