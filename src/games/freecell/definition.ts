import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'freecell',
  title: 'FreeCell',
  category: 'card',
  difficulty: 'medium',
  icon: '🆓',
  tags: ['solitaire', 'patience', 'cards', 'logic', 'single player', 'classic'],
  short: 'The thinking player’s solitaire — every card is face up.',
  full: 'Classic FreeCell solitaire. All 52 cards are dealt face up into eight columns, so almost every deal can be won with careful planning. Use the four free cells to park cards, build down in alternating colours and move every card to its foundation.',
  minutes: 10,
  multiplayer: 'single',
  controls: {
    keyboard: ['Tab to a card and press Enter to select it, then Tab to a destination and press Enter'],
    mouse: ['Click a card or run, then click where it should go; click a selected card again to send it home'],
    touch: ['Tap a card or run, then tap where it should go; tap it again to send it home'],
  },
  instructions: {
    objective: 'Move all 52 cards to the four foundations, building each suit up from Ace to King.',
    howToPlay: [
      'Build down the columns in alternating colours (a red 6 on a black 7).',
      'Any card can go into an empty free cell or an empty column.',
      'You can move a run of cards at once if there are enough free cells and empty columns to do it one card at a time.',
      'Aces and other safe cards go home automatically (except on Hard).',
      'Undo and Hint are always available.',
    ],
    scoring: '2,500 minus 10 per move and 1 per second (minimum 200).',
    difficultyNotes: 'Easy and Normal: four free cells with automatic foundation moves. Hard: only three free cells and no auto-play.',
    tips: ['Free the aces and twos first.', 'Empty columns are worth more than free cells.', 'Try not to fill all your free cells at once.'],
  },
  achievements: [
    ['win', 'Free at Last', 'Win a game of FreeCell.', 1, '🆓', 15],
    ['clean', 'No Regrets', 'Win without using Undo.', 1, '🎯', 20],
    ['three', 'Tight Squeeze', 'Win with only three free cells.', 1, '🏆', 30],
  ],
  load: () => import('./FreeCellGame'),
});
