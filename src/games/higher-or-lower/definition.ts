import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'higher-or-lower',
  title: 'Higher or Lower',
  category: 'card',
  difficulty: 'easy',
  icon: '⬆️',
  tags: ['cards', 'guessing', 'streak', 'luck', 'odds', 'quick'],
  short: 'Guess whether the next card is higher or lower — how long can your streak last?',
  full: 'A quick card-guessing game. Look at the face-up card and call whether the next one will be higher or lower. Bold calls against the odds score more points. Keep your streak going through the whole deck before you run out of lives.',
  minutes: 3,
  multiplayer: 'single',
  controls: {
    keyboard: ['Tab to Higher or Lower and press Enter'],
    mouse: ['Click Higher or Lower'],
    touch: ['Tap Higher or Lower'],
  },
  instructions: {
    objective: 'Score as many points as you can before your lives run out.',
    howToPlay: [
      'A card is showing. Guess whether the next card will be higher or lower. Aces are high.',
      'A right guess scores points; a wrong guess costs a life.',
      'A card of the same rank counts as a miss (except on Easy).',
      'The odds shown on the buttons are worked out from the cards not yet seen.',
    ],
    scoring: 'Each right guess scores 10 divided by its chance of being right — about 20 for a coin-flip, much more for long shots. Getting through the whole deck adds 200.',
    difficultyNotes: 'Easy: 3 lives and ties are free. Normal: 2 lives. Hard: 1 life and the odds are hidden.',
    tips: ['Count the cards: once all the kings have gone, “higher” from a queen is a sure thing.', 'Middle cards (7s and 8s) are the riskiest.'],
  },
  achievements: [
    ['streak', 'On a Streak', 'Get 10 right in a row.', 10, '🔥', 15],
    ['bold', 'Against the Odds', 'Win a guess with less than a 25% chance.', 1, '🎲', 10],
    ['score', 'High Roller', 'Score 500 points in one game.', 500, '💯', 20],
    ['deck', 'Through the Deck', 'Reach the last card of the deck.', 1, '🏆', 30],
  ],
  load: () => import('./HigherLowerGame'),
});
