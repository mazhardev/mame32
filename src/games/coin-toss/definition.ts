import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'coin-toss',
  title: 'Coin Toss',
  category: 'casual',
  difficulty: 'easy',
  icon: '🪙',
  tags: ['luck', 'quick', 'simple', 'casual'],
  short: 'Call heads or tails and see how long your lucky streak can last.',
  full: 'A fair, animated coin toss. Call heads or tails before each flip. Correct calls build your streak; wrong calls cost a life. How many can you get right before your luck runs out? Each toss is an independent 50/50, so no strategy beats the coin — it is pure luck.',
  minutes: 1,
  controls: {
    keyboard: ['H or ← calls heads, T or → calls tails'],
    mouse: ['Click Heads or Tails'],
    touch: ['Tap Heads or Tails'],
  },
  instructions: {
    objective: 'Make as many correct calls as you can before running out of lives.',
    howToPlay: [
      'Choose heads or tails. The coin is flipped right after you call.',
      'A correct call adds to your streak.',
      'A wrong call costs one life and resets your streak.',
    ],
    scoring: '10 points per correct call plus 5 per toss in your best streak.',
    difficultyNotes: 'Easy: 3 lives. Normal: 2 lives. Hard: 1 life.',
    tips: ['The coin has no memory: five heads in a row does not make tails more likely.'],
  },
  achievements: [
    ['streak-3', 'Lucky', 'Call 3 tosses in a row.', 3, '🍀', 10],
    ['streak-6', 'Charmed', 'Call 6 tosses in a row.', 6, '🌟', 25],
    ['correct-15', 'Fortune Favours', 'Make 15 correct calls in one game.', 15, '🏆', 25],
    ['total', 'Coin Collector', 'Make 200 correct calls in total.', 200, '🎖️', 30],
  ],
  load: () => import('./CoinTossGame'),
});
