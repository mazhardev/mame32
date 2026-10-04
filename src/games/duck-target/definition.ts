import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'duck-target',
  title: 'Duck Target',
  category: 'action',
  difficulty: 'easy',
  icon: '🦆',
  tags: ['aim', 'reflex', 'classic', 'shooting gallery', 'action'],
  short: 'Two cartoon ducks per round, three shots — tag them before they fly away.',
  full: 'A light-hearted marsh shooting gallery in the spirit of the arcade classics, with cartoon ducks that just tumble back into the reeds. Each round two ducks flap out of the reeds and zigzag around the sky. You have three shots to tag them both before they escape. Golden ducks are rare and worth triple. Get both ducks in a round for a perfect-round bonus.',
  minutes: 3,
  controls: {
    keyboard: ['Arrow keys move the sight', 'Space fires'],
    mouse: ['Click a duck to fire'],
    touch: ['Tap a duck to fire'],
  },
  instructions: {
    objective: 'Tag as many ducks as you can over ten rounds.',
    howToPlay: [
      'Two ducks fly up each round. You get three shots.',
      'Ducks change direction unpredictably and fly away after a few seconds — or when you run out of shots.',
      'If more than ten ducks escape in total, the season ends early.',
    ],
    scoring: '500 per duck (1,500 for a golden duck), more in later rounds, plus 1,000 for tagging both ducks in a round.',
    difficultyNotes: 'Higher difficulty makes ducks fly faster.',
    tips: ['Wait a moment for a duck to turn before firing.', 'Save a shot for the second duck.'],
  },
  achievements: [
    ['hits-15', 'Good Eye', 'Tag 15 ducks in one game.', 15, '🦆', 15],
    ['perfect', 'Double Tap', 'Score a perfect round.', 1, '✌️', 15],
    ['all', 'Not One Escaped', 'Tag all 20 ducks in a game.', 1, '🏆', 30],
    ['total', 'Marsh Legend', 'Tag 500 ducks in total.', 500, '🎖️', 30],
  ],
  load: () => import('./DuckTargetGame'),
});
