import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'balance-game',
  title: 'Balance Game',
  category: 'casual',
  difficulty: 'medium',
  icon: '⚖️',
  tags: ['physics', 'balance', 'endless', 'reflex', 'casual'],
  short: 'Keep a wobbly pole upright on a cart while gusts of wind try to knock it over.',
  full: 'A real inverted-pendulum balancing act. A tall pole stands on a little cart. Drive the cart left and right to keep the pole from toppling — just like balancing a broom on your hand, you move towards the side it is leaning. Gusts of wind push the pole and get stronger the longer you last.',
  minutes: 2,
  controls: {
    keyboard: ['← → or A / D drive the cart'],
    mouse: ['Hold the left or right half of the play area'],
    touch: ['Hold the left or right half, or use the arrow buttons'],
  },
  instructions: {
    objective: 'Keep the pole balanced for as long as possible.',
    howToPlay: [
      'The pole starts almost upright but will fall without help.',
      'If the pole leans right, drive right to get the cart back under it — and the same for left.',
      'Wind gusts (shown at the top) push the pole sideways.',
      'If the pole leans more than 60°, it falls and the round ends.',
    ],
    scoring: '10 points per second balanced.',
    difficultyNotes: 'Higher difficulty makes the pole tip faster and the gusts stronger.',
    tips: ['Use short taps rather than holding a direction.', 'Correct early: small leans are easy to fix, big ones are not.'],
    touchNotes: ['Hold your thumb on the side the pole leans towards.'],
  },
  achievements: [
    ['survive-20', 'Steady Hands', 'Balance for 20 seconds.', 20, '⚖️', 15],
    ['survive-60', 'Tightrope Master', 'Balance for 60 seconds.', 60, '🏆', 30],
    ['total', 'Zen Balance', 'Balance for 10 minutes in total.', 600, '🎖️', 30],
  ],
  load: () => import('./BalanceGame'),
});
