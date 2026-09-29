import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'asteroid-blaster',
  title: 'Asteroid Blaster',
  category: 'arcade',
  difficulty: 'medium',
  icon: '☄️',
  tags: ['space', 'shooter', 'classic', 'retro', 'waves'],
  short: 'Pilot a nimble ship through a field of drifting rocks and blast them into dust.',
  full: 'A classic space shooter in a wrap-around asteroid field. Turn, thrust and fire to break big rocks into smaller, faster ones until the sector is clear. Fly off one edge and you reappear on the other. From wave 3 a saucer drops by to shoot back — and when things look hopeless, jump to hyperspace and hope for the best.',
  minutes: 5,
  controls: {
    keyboard: ['← / → turn', '↑ thrust', 'Space fires', 'X or ↓ jumps to hyperspace'],
    mouse: ['Hold the mouse button on the game to fire (steer with the keyboard)'],
    touch: ['◀ ▶ turn', 'Thrust and Fire buttons'],
  },
  instructions: {
    objective: 'Clear wave after wave of asteroids without losing all your ships.',
    howToPlay: [
      'Shooting a large rock splits it in two medium rocks; medium rocks split into small ones; small ones are destroyed.',
      'Your ship keeps drifting in space — thrust in the opposite direction to slow down.',
      'Everything wraps around the edges of the screen.',
      'You are safe for a moment after respawning (the ship blinks).',
    ],
    scoring: 'Large 20, medium 50, small 100, saucer 200, plus 250 for clearing a wave.',
    difficultyNotes: 'Easy: slow rocks and an extra ship. Hard: fast rocks.',
    tips: ['Stay near the centre and let rocks come to you.', 'Small rocks are fastest — clear them first.'],
    touchNotes: ['Turn with the pad on the left; hold Thrust and Fire on the right.'],
  },
  achievements: [
    ['score-5000', 'Rock Breaker', 'Score 5,000 points.', 5000, '☄️', 20],
    ['wave-5', 'Deep Field', 'Reach wave 5.', 5, '🌌', 25],
    ['score-20000', 'Ace Pilot', 'Score 20,000 points.', 20000, '🏆', 40],
    ['rocks', 'Space Janitor', 'Destroy 1,000 rocks in total.', 1000, '🧹', 30],
  ],
  load: () => import('./AsteroidBlasterGame'),
});
