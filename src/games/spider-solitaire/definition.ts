import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'spider-solitaire',
  title: 'Spider Solitaire',
  category: 'card',
  difficulty: 'hard',
  icon: '🕷️',
  tags: ['solitaire', 'patience', 'cards', 'two decks', 'single player', 'classic'],
  short: 'Two-deck solitaire: build King-to-Ace runs of one suit to clear the table.',
  full: 'The famous two-deck solitaire. Arrange 104 cards in ten columns, building down regardless of suit — but only runs of a single suit can move together. Complete a run from King to Ace and it leaves the table. Clear all eight to win. Play with one, two or four suits. Your game is saved automatically.',
  minutes: 15,
  multiplayer: 'single',
  hasSaveState: true,
  hasLevels: true,
  controls: {
    keyboard: ['Tab to a card and press Enter to select, then Enter on a card in another column'],
    mouse: ['Click a card to pick up its run, then click a destination column; click it again to auto-move'],
    touch: ['Tap a card to pick up its run, then tap a destination column; tap it again to auto-move'],
  },
  instructions: {
    objective: 'Remove all eight King-to-Ace runs from the table.',
    howToPlay: [
      'Any card can be placed on a card one rank higher, whatever its suit.',
      'A group of cards can only be moved together if they are the same suit and in order.',
      'Any card or run can go into an empty column.',
      'When a full King-to-Ace run of one suit forms, it is removed automatically.',
      'Deal a new row (one card on each column) from the stock when you are stuck — but every column must have at least one card.',
    ],
    scoring: '1,300 minus one per move, multiplied by the number of suits.',
    difficultyNotes: 'Easy: one suit (spades). Normal: two suits. Hard: all four suits.',
    tips: ['Build in suit whenever you can.', 'Empty columns are precious — use them to reorder runs.', 'Uncover face-down cards before dealing a new row.'],
  },
  achievements: [
    ['run', 'Full Suit', 'Complete a King-to-Ace run.', 1, '🕸️', 5],
    ['win', 'Web Weaver', 'Win a game of Spider.', 1, '🕷️', 15],
    ['two', 'Two-Suit Spider', 'Win with two suits.', 1, '🏅', 25],
    ['four', 'Spider Master', 'Win with all four suits.', 1, '🏆', 50],
  ],
  load: () => import('./SpiderGame'),
});
