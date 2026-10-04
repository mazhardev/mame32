import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'target-shooting',
  title: 'Target Shooting',
  category: 'action',
  difficulty: 'easy',
  icon: '🎯',
  tags: ['aim', 'precision', 'breathing', 'scoring', 'action'],
  short: 'Ten shots at a ringed target — steady your breathing and squeeze the trigger.',
  full: 'A calm, precise rifle-range game. Your sight drifts gently with your breathing, so timing matters as much as aim. Hold your breath to steady the crosshair for a few seconds, but not for too long, or it starts to shake. Score each shot by the ring it lands in, from 10 in the centre to 1 at the edge, and aim for the tiny inner X. On Hard, a changing wind nudges every shot.',
  minutes: 2,
  controls: {
    keyboard: ['Arrow keys move the sight', 'Hold Shift or X to hold your breath', 'Space fires'],
    mouse: ['Move to aim, press and release the button to fire', 'Hold Shift to steady'],
    touch: ['Drag to aim and lift your finger to fire', 'Hold the Steady button with the other thumb'],
  },
  instructions: {
    objective: 'Score as close to 100 as you can with ten shots.',
    howToPlay: [
      'Point at the target. The sight drifts in a slow figure of eight.',
      'Hold your breath to make it almost still. The breath bar drains while you hold.',
      'If you run out of breath the sight turns red and shakes for a moment.',
      'Fire when the crosshair passes over the centre.',
    ],
    scoring: 'Each shot scores 10 for the centre ring down to 1 for the outer ring. Hits inside the small X ring are counted separately.',
    difficultyNotes: 'Easy: gentle sway. Hard: strong sway and a wind that moves each shot sideways.',
    tips: ['Hold your breath, wait for the sight to settle, then fire.', 'On Hard, aim slightly upwind.'],
    touchNotes: ['Fire happens when you lift your finger, so drag onto the centre and let go.'],
  },
  achievements: [
    ['score-80', 'Marksman', 'Score 80 or more.', 80, '🎯', 15],
    ['score-95', 'Sharpshooter', 'Score 95 or more.', 95, '🏆', 30],
    ['x-3', 'X Marks the Spot', 'Hit the inner X three times in one round.', 3, '❌', 25],
    ['rounds', 'Range Regular', 'Shoot 25 rounds.', 25, '🎖️', 20],
  ],
  load: () => import('./TargetShootingGame'),
});
