import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'top-down-racing',
  title: 'Top Down Car Racing',
  category: 'racing',
  difficulty: 'medium',
  icon: '🏎️',
  tags: ['laps', 'track', 'ai', 'cars', 'racing'],
  short: 'Race three rivals over three laps of a country circuit — seen from above.',
  full: 'Classic top-down racing. Line up on the grid with three computer drivers, wait for the countdown and race three laps of a winding country circuit. Brake before the bends, use the handbrake to swing round tight corners, and stay off the grass — it slows you right down. Watch the minimap to see where your rivals are.',
  minutes: 4,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['↑ accelerate, ↓ brake / reverse', '← → steer', 'Space or X: handbrake slide'],
    mouse: ['Hold the button: the car drives towards the pointer'],
    touch: ['Direction pad and Drift button, or hold the screen to drive towards your finger'],
  },
  instructions: {
    objective: 'Finish the three laps ahead of the other cars.',
    howToPlay: [
      'Wait for the countdown, then accelerate.',
      'Grass slows you down; the barrier beyond it stops you.',
      'Brake before a bend rather than in it. The handbrake makes the back of the car slide.',
      'Laps only count once you have gone all the way round.',
    ],
    scoring: '1st place 1,000 points, 2nd 600, 3rd 400, 4th 200.',
    difficultyNotes: 'Higher difficulty gives rivals faster cars and better racing lines.',
    tips: ['Take the outside of a bend in, cut to the inside, and drift back out.', 'Bumping rivals slows both of you.'],
    touchNotes: ['Holding the screen drives towards your finger; let go to coast.'],
  },
  achievements: [
    ['podium', 'On the Podium', 'Finish in the top three.', 1, '🥉', 10],
    ['win', 'Chequered Flag', 'Win a race.', 1, '🏁', 20],
    ['hard', 'Pro Driver', 'Win on Hard.', 1, '🏆', 30],
    ['races', 'Racing Season', 'Complete 20 races.', 20, '🎖️', 25],
  ],
  load: () => import('./TopDownRacingGame'),
});
