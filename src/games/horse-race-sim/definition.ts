import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'horse-race-sim',
  title: 'Horse Race Simulation',
  category: 'sports',
  difficulty: 'easy',
  icon: '🐎',
  tags: ['racing', 'simulation', 'virtual points', 'odds', 'strategy', 'sports'],
  short: 'Study the form, back a runner with virtual points and watch eight simulated races.',
  full: 'A day at the races with virtual points only. Each race has six runners with hidden speed, stamina and finishing kick; their recent form and the odds are your clues. Back a horse to win, or to finish in the top three for a smaller return, then watch the race unfold. Try to finish the eight-race meeting with more points than you started with. There is no real money and nothing to buy.',
  minutes: 6,
  controls: {
    keyboard: [
      '1–6 choose a horse',
      'W win bet, P place bet',
      '← → change the stake',
      'Enter starts the race / next race',
    ],
    mouse: ['Click a runner, choose Win or Place, set the stake and start the race'],
    touch: ['Tap a runner, choose Win or Place, set the stake and tap Back'],
  },
  instructions: {
    objective: 'Finish the eight-race meeting with more than the 100 points you start with.',
    howToPlay: [
      'Form shows each horse’s last three finishes (1 = won).',
      'Odds show the return for a winning bet: 4.0× turns a 10-point stake into 40 points.',
      'A place bet pays about a quarter of the win odds if your horse finishes in the top three.',
      'You can also watch a race without betting by setting the stake to 0.',
    ],
    scoring: 'Your score is the number of points you finish the meeting with.',
    difficultyNotes:
      'On Easy the form and odds are reliable and the bookmaker’s margin is small. On Hard there are more upsets and the margin is bigger, so value is harder to find.',
    tips: [
      'Short odds win more often but pay less; spread your stakes.',
      'Horses with strong form and long odds can be good value.',
    ],
    touchNotes: ['All controls are large buttons; the race plays automatically.'],
  },
  achievements: [
    ['winner', 'Backed a Winner', 'Collect on a bet.', 1, '🐎', 10],
    ['streak', 'Hot Streak', 'Win three bets in a row.', 3, '🔥', 25],
    ['longshot', 'Long Shot', 'Win a bet at odds of 8× or more.', 1, '🎯', 25],
    ['double', 'Doubled Up', 'Finish a meeting with 200 points or more.', 1, '💰', 30],
    ['meetings', 'Racegoer', 'Finish 5 race meetings.', 5, '🎟️', 20],
    ['hard', 'Form Expert', 'Finish with 150+ points on Hard.', 1, '🏆', 40],
  ],
  load: () => import('./HorseRaceGame'),
});
