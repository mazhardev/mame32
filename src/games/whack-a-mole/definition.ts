import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'whack-a-mole',
  title: 'Whack-a-Mole',
  category: 'arcade',
  difficulty: 'easy',
  icon: '🔨',
  tags: ['reflex', 'tap', 'timed', 'casual', 'kids'],
  short: 'Moles pop up for a moment — whack as many as you can in 45 seconds.',
  full: 'A quick-reflex classic. Moles pop out of nine holes and duck back down a moment later. Whack them for points, chase golden moles for a big bonus, and build a combo for a score multiplier — but leave the moles in helmets alone.',
  minutes: 1,
  controls: {
    keyboard: ['Keys 1–9 whack the matching hole (1 is top-left, 9 bottom-right)'],
    mouse: ['Click a mole'],
    touch: ['Tap a mole'],
  },
  instructions: {
    objective: 'Score as many points as possible before the 45 seconds run out.',
    howToPlay: [
      'Whack a mole while it is above ground.',
      'Golden moles are quick but worth three times as much.',
      'Moles wearing a helmet are off limits: hitting one costs 20 points and your combo.',
      'Every five hits in a row raises your multiplier, up to ×4. Missing a mole or tapping an empty hole resets it.',
    ],
    scoring: '10 points per mole, 30 per golden mole, multiplied by your combo level. −20 for a helmet mole.',
    difficultyNotes: 'Easy: moles stay up longer and appear slowly. Hard: fast moles and quick spawns.',
    tips: ['Keep your eyes in the middle and react outwards.', 'On a keyboard, rest three fingers on 4, 5 and 6.'],
    touchNotes: ['Tap the moles with a finger; two thumbs work well on a phone.'],
  },
  achievements: [
    ['score-300', 'Mallet Master', 'Score 300 points in a round.', 300, '🔨', 15],
    ['score-600', 'Mole Menace', 'Score 600 points in a round.', 600, '🏆', 30],
    ['combo', 'On a Roll', 'Reach a combo of 15.', 15, '🔥', 20],
    ['total', 'Garden Guardian', 'Whack 500 moles in total.', 500, '🌱', 30],
  ],
  load: () => import('./WhackAMoleGame'),
});
