import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'tank-shooter',
  title: 'Tank Shooter',
  category: 'action',
  difficulty: 'medium',
  icon: '💥',
  tags: ['shooter', 'tanks', 'aim', 'armour', 'action'],
  short: 'Command a tank with a free-aiming turret — blast through brick walls and enemy tanks.',
  full: 'Drive a tank the proper way: turn the hull left and right, roll forwards and backwards, and aim the turret independently with the mouse or your finger. Brick walls crumble after two hits, steel walls stop everything. Enemy tanks patrol the map and open fire when they spot you. Clear every sector to move on to a harder one.',
  minutes: 6,
  controls: {
    keyboard: ['↑ / W drive forwards, ↓ / S reverse', '← → / A D turn the hull', 'Space fires along the turret'],
    mouse: ['Aim the turret with the mouse, click to fire'],
    touch: ['Direction pad drives and turns', 'Touch the map to aim and fire, or press Fire'],
  },
  instructions: {
    objective: 'Destroy all enemy tanks in each sector.',
    howToPlay: [
      'Left and right turn your hull; up and down drive along the direction it faces.',
      'The turret aims at your pointer. Without a pointer it faces where the hull faces.',
      'Brick walls break after two shells; grey steel never breaks.',
      'Enemy tanks only fire when they have a clear line of sight to you.',
      'Clearing a sector repairs one point of armour.',
    ],
    scoring: '100 points per tank, plus a sector bonus and 50 per remaining armour point.',
    difficultyNotes: 'Higher difficulty makes enemy gunners more accurate.',
    tips: ['Use walls as cover: if they cannot see you, they cannot shoot.', 'Blast a hole in a brick wall to make a firing slit.'],
    touchNotes: ['Drive with the pad; touch where you want the turret to point.'],
  },
  achievements: [
    ['level-3', 'Tank Commander', 'Reach sector 3.', 3, '💥', 15],
    ['level-6', 'Steel Rain', 'Reach sector 6.', 6, '🏆', 30],
    ['total', 'Armoured Division', 'Destroy 100 enemy tanks in total.', 100, '🎖️', 30],
  ],
  load: () => import('./TankShooterGame'),
});
