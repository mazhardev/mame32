import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'alien-defender',
  title: 'Alien Defender',
  category: 'arcade',
  difficulty: 'medium',
  icon: '👾',
  tags: ['shooter', 'retro', 'classic', 'space', 'waves', 'featured'],
  short: 'Hold back a marching alien formation with your cannon — before they touch down.',
  full: 'A retro space shooter. Rows of aliens march back and forth, stepping lower each time they reach the edge and speeding up as their numbers fall. Slide your cannon along the ground, fire up through the formation, and shelter behind shields that crumble under fire. Shoot the mothership when it glides across the top for a mystery bonus.',
  minutes: 5,
  controls: {
    keyboard: ['← / → move', 'Space or ↑ fires'],
    mouse: ['Hold on the game to slide the cannon towards the pointer, click to fire'],
    touch: ['◀ ▶ move', 'Fire button'],
  },
  instructions: {
    objective: 'Destroy every alien in each wave before they reach the ground.',
    howToPlay: [
      'Aliens move sideways, then step down at the screen edge. The fewer there are, the faster they march.',
      'You can have two shots in the air at once.',
      'Green shields absorb shots from both sides and wear away.',
      'A bomb hit costs a life. If the aliens reach the ground, the game is over.',
    ],
    scoring: 'Bottom rows 20, middle rows 30, top row 40, mothership 50–300, plus 100 per wave cleared.',
    difficultyNotes: 'Easy: fewer bombs and an extra life. Hard: frequent bombs.',
    tips: ['Clear a whole column at the edge to slow their descent.', 'The last alien is very fast — lead your shot.'],
    touchNotes: ['Move with the pad, tap Fire on the right.'],
  },
  achievements: [
    ['wave-2', 'First Contact', 'Clear the first wave.', 2, '👾', 15],
    ['wave-5', 'Invasion Repelled', 'Reach wave 5.', 5, '🛸', 35],
    ['score', 'Top Gun', 'Score 5,000 points.', 5000, '🏆', 30],
    ['kills', 'Defender of Earth', 'Destroy 1,000 aliens in total.', 1000, '🌍', 30],
  ],
  load: () => import('./AlienDefenderGame'),
});
