import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'drift-challenge',
  title: 'Drift Challenge',
  category: 'racing',
  difficulty: 'hard',
  icon: '💨',
  tags: ['drift', 'score', 'physics', 'timed', 'racing'],
  short: 'Slide a loose rear-wheel-drive car through twisty bends and bank huge drift combos.',
  full: 'A drift-scoring challenge against the clock. Your car has very little rear grip, so with some throttle and the handbrake it slides sideways through the bends of a twisty practice track. Points build up while you hold a drift, and the multiplier climbs the longer you keep it going. Straighten up cleanly to bank the points — touch the grass or the barrier and the pending points are lost.',
  minutes: 2,
  controls: {
    keyboard: ['↑ throttle, ↓ brake', '← → steer', 'Hold Space or X for the handbrake'],
    mouse: ['Hold the button: the car steers towards the pointer'],
    touch: ['Direction pad and Drift (handbrake) button'],
  },
  instructions: {
    objective: 'Score as many drift points as possible before the timer runs out.',
    howToPlay: [
      'Turn into a bend and tap the handbrake to kick the back of the car out.',
      'Use throttle and opposite steering to hold the slide.',
      'The pending points and multiplier (up to ×5) are shown at the bottom.',
      'Straighten up and drive normally for a moment to bank them.',
      'Going off the track or hitting the barrier loses the pending drift.',
    ],
    scoring: 'Pending points grow with your slide angle and speed, multiplied by how long you have held the drift.',
    difficultyNotes: 'Easy: 100 seconds. Normal: 90 seconds. Hard: 75 seconds.',
    tips: ['Long, gentle drifts beat short wild ones: the multiplier needs time.', 'Bank often if you are near the edge.'],
    touchNotes: ['Hold the Drift button with one thumb and steer with the pad.'],
  },
  achievements: [
    ['score-5000', 'Sideways', 'Score 5,000 drift points.', 5000, '💨', 15],
    ['score-15000', 'Drift King', 'Score 15,000 drift points.', 15000, '👑', 30],
    ['big', 'Monster Drift', 'Bank a single drift worth 1,500 points.', 1500, '🔥', 25],
    ['total', 'Tyre Smoke', 'Bank 300 drifts in total.', 300, '🎖️', 25],
  ],
  load: () => import('./DriftChallengeGame'),
});
