import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'spin-the-wheel',
  title: 'Spin the Wheel',
  category: 'casual',
  difficulty: 'easy',
  icon: '🎡',
  tags: ['luck', 'virtual points', 'quick', 'casual'],
  short: 'Choose your stake and spin the prize wheel ten times — virtual points only.',
  full: 'A light-hearted luck game with virtual points that have no real-world value. Start with 100 points and ten spins. Before each spin, choose how much to stake; the wheel’s multiplier decides how much comes back. The average return of the wheel is shown on screen, so you always know the odds. There is nothing to buy and nothing to win except bragging rights.',
  minutes: 2,
  controls: {
    keyboard: ['Tab to a stake and the Spin button, Enter to press'],
    mouse: ['Click a stake, then Spin'],
    touch: ['Tap a stake, then Spin'],
  },
  instructions: {
    objective: 'Finish ten spins with as many points as possible.',
    howToPlay: [
      'You start with 100 virtual points.',
      'Choose a stake of 10, 25 or 50 points, then spin.',
      'Your stake is multiplied by the segment under the pointer: ×0 loses it, ×2 doubles it.',
      'The game ends after ten spins, or when you run out of points.',
    ],
    scoring: 'Your final point total is your score.',
    difficultyNotes: 'The wheel changes with difficulty: Easy has a slightly generous wheel, Hard a slightly stingy one. The average return is always shown.',
    tips: ['Bigger stakes swing your score more in both directions.', 'This is a simulation for fun; points have no value.'],
  },
  achievements: [
    ['finish', 'Still Standing', 'Finish ten spins with points left.', 1, '🎡', 10],
    ['jackpot', 'Big Wheel', 'Land on a ×3 or better.', 1, '🎉', 15],
    ['double', 'Double Up', 'Finish with at least 200 points.', 1, '🏆', 25],
    ['spins', 'Wheel Regular', 'Spin 100 times in total.', 100, '🎖️', 20],
  ],
  load: () => import('./SpinTheWheelGame'),
});
