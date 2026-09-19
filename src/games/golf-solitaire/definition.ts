import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'golf-solitaire',
  title: 'Golf Solitaire',
  category: 'card',
  difficulty: 'easy',
  icon: '⛳',
  tags: ['solitaire', 'patience', 'cards', 'sequence', 'single player', 'quick'],
  short: 'Clear seven columns by playing cards one higher or lower onto the waste.',
  full: 'A quick, open solitaire. Seven columns of five cards are all face up. Play the bottom card of any column onto the waste if it is one rank higher or lower, and flip from the stock when you can’t. Like golf, the fewer cards you leave, the better.',
  minutes: 4,
  multiplayer: 'single',
  controls: {
    keyboard: ['Tab to the bottom card of a column and press Enter; Enter on the stock flips a card'],
    mouse: ['Click the bottom card of a column; click the stock to flip'],
    touch: ['Tap the bottom card of a column; tap the stock to flip'],
  },
  instructions: {
    objective: 'Move all 35 column cards to the waste pile.',
    howToPlay: [
      'Only the bottom (front) card of each column can be played.',
      'It must be one rank higher or lower than the top waste card, whatever the suit.',
      'Flip a card from the stock when you have no play. The game ends when the stock is empty and no play is left.',
      'Every card left in the columns counts as a stroke — lower is better.',
    ],
    scoring: '20 points per card cleared plus 30 per unused stock card.',
    difficultyNotes: 'Easy: Kings and Aces connect, you can play onto Kings, and playable columns are highlighted. Normal: no wrapping. Hard: traditional rules — nothing can be played onto a King.',
    tips: ['Look for long chains before playing.', 'Save cards that can bridge to a column’s next card.'],
  },
  achievements: [
    ['win', 'Hole in One', 'Clear every column.', 1, '⛳', 15],
    ['close', 'Under Par', 'Finish with 5 or fewer cards left.', 1, '🏌️', 10],
    ['hard', 'Tour Pro', 'Clear every column on Hard.', 1, '🏆', 30],
  ],
  load: () => import('./GolfGame'),
});
