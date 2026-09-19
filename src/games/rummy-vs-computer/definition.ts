import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'rummy-vs-computer',
  title: 'Rummy vs Computer',
  category: 'card',
  difficulty: 'hard',
  icon: '🎴',
  tags: ['cards', 'rummy', 'gin', 'melds', 'sets', 'runs', 'ai'],
  short: 'Gin-style rummy: form sets and runs, then knock before the computer.',
  full: 'Two-player gin-style rummy against a computer opponent. Draw and discard to build sets (three or four of a kind) and runs (three or more in a row of one suit). When your leftover “deadwood” is 10 or less you can knock; get it to zero for gin. First to 60 points wins.',
  minutes: 12,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab to the stock or discard pile to draw, then to a card and press Enter; use Discard or Knock'],
    mouse: ['Click the stock or discard pile, click a card, then Discard or Knock'],
    touch: ['Tap the stock or discard pile, tap a card, then Discard or Knock'],
  },
  instructions: {
    objective: 'Reach 60 points before the computer.',
    howToPlay: [
      'Each player has 10 cards. On your turn, draw one card (stock or top discard), then discard one.',
      'Melds are sets of 3–4 cards of the same rank, or runs of 3+ cards in sequence in one suit (aces are low). Your hand is arranged into the best melds automatically.',
      'Unmelded cards are deadwood: aces 1, number cards their value, face cards 10.',
      'Knock when your deadwood is 10 or less after discarding. With zero deadwood you go gin.',
      'After a knock, the other player may lay off deadwood onto the knocker’s melds.',
    ],
    scoring: 'Knock: the difference in deadwood. Gin: the opponent’s deadwood + 25. If the defender has equal or less deadwood, they undercut and score the difference + 25.',
    difficultyNotes: 'Easy: the computer draws almost at random and knocks early. Normal: it plays for the lowest deadwood. Hard: it also avoids feeding you cards and waits for stronger knocks.',
    tips: ['Discard high unmatched cards early.', 'Watch which discards the computer picks up.', 'Knock early if the computer seems close to gin.'],
  },
  achievements: [
    ['win', 'Rummy Winner', 'Win a game against the computer.', 1, '🎴', 15],
    ['gin', 'Gin!', 'Go gin.', 1, '🍸', 20],
    ['undercut', 'Undercut', 'Undercut the computer’s knock.', 1, '✂️', 20],
    ['hard', 'Rummy Master', 'Win on Hard.', 1, '🏆', 35],
  ],
  load: () => import('./RummyGame'),
});
