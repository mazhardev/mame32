import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'three-card-game',
  title: 'Three Card Game',
  category: 'card',
  difficulty: 'medium',
  icon: '🎴',
  tags: ['cards', 'poker style', 'casino style', 'simulation', 'virtual points', 'vs dealer'],
  short: 'Three-card poker-style showdown against the dealer, with virtual points.',
  full: 'A fast three-card poker-style simulation played with virtual points only. Place an ante, look at your three cards and decide: play on with a matching bet, or fold. The dealer needs queen-high to qualify. Straights and better earn an ante bonus whatever the dealer holds.',
  minutes: 5,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab to a stake and Deal; then choose Play or Fold'],
    mouse: ['Pick a stake, click Deal, then Play or Fold'],
    touch: ['Pick a stake, tap Deal, then Play or Fold'],
  },
  instructions: {
    objective: 'Finish 20 hands with more virtual points than you started with.',
    howToPlay: [
      'Choose an ante and deal. You and the dealer each get three cards; the dealer’s are face down.',
      'Fold to lose only your ante, or Play by adding a bet equal to your ante.',
      'If the dealer doesn’t have queen-high or better, your ante pays 1:1 and your play bet is returned.',
      'Otherwise the better hand wins both bets. Hands rank: straight flush, three of a kind, straight, flush, pair, high card.',
      'Straights pay an ante bonus of 1:1, three of a kind 4:1 and straight flushes 5:1.',
    ],
    scoring: 'Your score is the points you hold at the end.',
    difficultyNotes: 'Easy: a tip tells you whether to play or fold. Normal: no tips. Hard: you start with only 500 points.',
    tips: ['A good simple rule: play with queen-six-four or better, fold anything weaker.'],
  },
  achievements: [
    ['profit', 'Ahead of the House', 'Finish 20 hands in profit.', 1, '📈', 15],
    ['wins', 'Winning Streak', 'Beat a qualifying dealer 5 times in one session.', 5, '🎴', 10],
    ['bonus', 'Bonus Round', 'Earn an ante bonus.', 1, '✨', 5],
    ['trips', 'Trips!', 'Be dealt three of a kind or a straight flush.', 1, '🎯', 20],
  ],
  load: () => import('./ThreeCardGame'),
});
