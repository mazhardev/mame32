import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'darts',
  title: 'Darts',
  category: 'sports',
  difficulty: 'medium',
  icon: '🎯',
  tags: ['aim', 'precision', 'scoring', 'ai', 'sports'],
  short: 'Play 301 against the computer — aim for treble 20 and finish on a double.',
  full: 'A full game of 301 darts against a computer opponent. Each of you starts on 301 and takes turns of three darts, counting down. Your hand drifts gently, so release the dart as the sight passes over your target. To win you must hit exactly zero, and the final dart must be a double (or the bullseye). Go below zero, leave 1, or reach zero without a double and the turn is a bust.',
  minutes: 6,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Arrow keys aim', 'Space throws'],
    mouse: ['Point at the board; press and release to throw'],
    touch: ['Drag the sight onto your target and lift your finger to throw'],
  },
  instructions: {
    objective: 'Reach exactly zero before the computer, finishing on a double.',
    howToPlay: [
      'Your sight drifts in a small loop. Release when it is over your target.',
      'The outer thin ring doubles a number, the inner thin ring trebles it.',
      'The outer bull is 25; the inner bullseye is 50 and counts as a double.',
      'A bust (below zero, exactly 1, or zero without a double) cancels your whole turn.',
    ],
    scoring: 'Winning scores 500 plus 20 for each dart under 30 you needed.',
    difficultyNotes: 'The computer’s throws are less accurate on Easy and very accurate on Hard. Your sway is slightly larger on Hard.',
    tips: ['Treble 20 is at the top: aim at the narrow red band.', 'Plan your finish: from 40, one dart at double 20 wins.'],
    touchNotes: ['Lift your finger at the moment the sight crosses your target.'],
  },
  achievements: [
    ['win', 'Game Shot', 'Beat the computer.', 1, '🎯', 20],
    ['max', 'One Hundred and Eighty!', 'Score 180 in one turn.', 1, '💯', 40],
    ['hard', 'Oche Master', 'Beat the computer on Hard.', 1, '🏆', 35],
    ['wins', 'Pub Champion', 'Beat the computer 10 times.', 10, '🎖️', 30],
  ],
  load: () => import('./DartsGame'),
});
