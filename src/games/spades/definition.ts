import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'spades',
  title: 'Spades vs AI',
  category: 'card',
  difficulty: 'hard',
  icon: '♠️',
  tags: ['cards', 'trick taking', 'bidding', 'partners', 'trumps', 'ai', 'four players'],
  short: 'Bid and win tricks with a computer partner — spades are always trumps.',
  full: 'The partnership trick-taking classic. You and your computer partner (North) take on two computer opponents. Everyone bids how many tricks they will win, spades are always trumps, and your team scores only if it makes its combined bid. Watch out for bags — every ten overtricks costs 100 points. First team to 250 wins.',
  minutes: 20,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Use − and + to set your bid; Tab to a highlighted card and press Enter to play it'],
    mouse: ['Set your bid, then click a highlighted card'],
    touch: ['Set your bid, then tap a highlighted card'],
  },
  instructions: {
    objective: 'Be the first team to 250 points.',
    howToPlay: [
      'Each player bids the number of tricks they expect to win. Your bid adds to your partner’s to make the team contract.',
      'Follow the suit led if you can. If you can’t, you may play a spade (trump) or any other card.',
      'The highest spade wins the trick; if there is no spade, the highest card of the suit led wins.',
      'Spades can’t be led until one has been played on another suit (unless you hold only spades).',
    ],
    scoring: 'Make your contract: 10 per trick bid plus 1 per extra trick (a “bag”). Miss it: minus 10 per trick bid. Ten bags cost 100 points.',
    difficultyNotes: 'Easy: opponents play random legal cards and a suggested bid is shown. Normal: they play sensibly with their partner. Hard: they also avoid taking extra tricks once their bid is made.',
    tips: ['Aces and high spades are your surest tricks.', 'If your partner is already winning a trick, play low.', 'Don’t overbid — being set costs more than a few bags.'],
  },
  achievements: [
    ['contract', 'Made It', 'Make your team’s contract.', 1, '♠️', 5],
    ['big', 'Heavy Lifter', 'Personally win 5 tricks in a hand your team makes.', 1, '💪', 10],
    ['win', 'Spade Ace', 'Win a game with your partner.', 1, '🤝', 20],
    ['hard', 'Grand Slam', 'Win a game on Hard.', 1, '🏆', 40],
  ],
  load: () => import('./SpadesGame'),
});
