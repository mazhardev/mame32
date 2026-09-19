import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'baccarat',
  title: 'Baccarat',
  category: 'card',
  difficulty: 'easy',
  icon: '🎰',
  tags: ['cards', 'casino style', 'simulation', 'virtual points', 'punto banco'],
  short: 'Back Player, Banker or Tie in this card-game simulation using virtual points.',
  full: 'A simulation of the card game baccarat (punto banco) played with virtual points only — no real money and nothing to buy. Back the Player hand, the Banker hand or a Tie, then watch the cards follow the traditional drawing rules. Try to finish twenty hands with more points than you started with.',
  minutes: 5,
  multiplayer: 'single',
  controls: {
    keyboard: ['Tab to your choice and stake, then press Enter on Deal'],
    mouse: ['Choose a side and stake, then click Deal'],
    touch: ['Choose a side and stake, then tap Deal'],
  },
  instructions: {
    objective: 'Finish 20 hands with more virtual points than you started with.',
    howToPlay: [
      'Choose to back Player, Banker or Tie and pick a stake.',
      'Two hands are dealt. Tens and face cards count 0, aces 1, and only the last digit of a total counts (7 + 8 = 5).',
      'A third card may be drawn automatically according to the fixed rules; the hand closer to 9 wins.',
      'Player bets pay 1:1, Banker bets 0.95:1 and Tie bets 8:1. On a tie, Player and Banker bets are returned.',
      'All points are virtual and have no value.',
    ],
    scoring: 'Your score is the points you hold after 20 hands.',
    difficultyNotes: 'You start with 2,000 points on Easy, 1,000 on Normal and 500 on Hard.',
    tips: ['Banker wins slightly more often than Player, which is why it pays a little less.', 'Tie bets pay well but rarely win.'],
  },
  achievements: [
    ['profit', 'In Profit', 'Finish 20 hands with more points than you started with.', 1, '📈', 10],
    ['double', 'Double Up', 'Finish with twice your starting points.', 1, '💰', 25],
    ['tie', 'Called It', 'Win a Tie bet.', 1, '🤝', 15],
    ['natural', 'Natural', 'See a natural 8 or 9.', 1, '✨', 5],
  ],
  load: () => import('./BaccaratGame'),
});
