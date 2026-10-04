import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'precision-target',
  title: 'Precision Target',
  category: 'action',
  difficulty: 'medium',
  icon: '🎯',
  tags: ['aim', 'accuracy', 'precision', 'mouse', 'action'],
  short: 'Accuracy over speed: hit each drifting, shrinking target as close to dead centre as you can.',
  full: 'A pure accuracy challenge. Twenty targets appear one by one, drifting along smooth paths and shrinking while a timer ring runs down. You get one click per target, scored by how close it lands to the bullseye: 100 % for dead centre, falling to 1 % at the rim. Take your time — but not too much.',
  minutes: 2,
  keyboard: false,
  controls: {
    mouse: ['Click each target once'],
    touch: ['Tap each target once'],
  },
  instructions: {
    objective: 'Score the highest average precision over twenty targets.',
    howToPlay: [
      'A target appears and moves along a smooth curve while shrinking.',
      'Click it once. The closer to the centre, the higher the score.',
      'If the yellow ring runs out, or you click outside the target, that target scores 0.',
    ],
    scoring: 'Each target scores 0–100 points by precision; the total is your score.',
    difficultyNotes: 'Higher difficulty makes targets move further and fade sooner.',
    tips: ['Track the target with the pointer and click when it slows at the end of its swing.', 'Later targets are smaller, so be patient.'],
    touchNotes: ['A stylus or a careful fingertip works best; the target is scored at the centre of your touch.'],
  },
  achievements: [
    ['avg-70', 'Steady Hand', 'Average 70 % or better.', 70, '🎯', 15],
    ['avg-85', 'Surgeon', 'Average 85 % or better.', 85, '🏆', 30],
    ['bulls-10', 'Bullseye Collector', 'Get 10 bullseyes (90 %+) in one round.', 10, '⭐', 25],
    ['rounds', 'Practice Makes Perfect', 'Complete 25 rounds.', 25, '🎖️', 20],
  ],
  load: () => import('./PrecisionTargetGame'),
});
