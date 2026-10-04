import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'truck-driving',
  title: 'Truck Driving',
  category: 'racing',
  difficulty: 'medium',
  icon: '🚚',
  tags: ['cargo', 'delivery', 'physics', 'levels', 'racing'],
  short: 'Haul a load of loose crates over the hills to the depot — without spilling them.',
  full: 'A delivery driving game where smooth beats fast. Your flatbed truck carries a few loose crates. Brake hard, slam on the gas, crest a hill too quickly or land from a bump, and the crates slide — anything that slides off the bed is gone. Reach the depot flag before the timer runs out with at least one crate to complete the delivery. Each new route is longer and hillier, with more crates to carry.',
  minutes: 5,
  hasLevels: true,
  controls: {
    keyboard: ['→ or ↑ gas', '← or ↓ brake / reverse'],
    mouse: ['Hold the right half of the play area for gas, the left half for brake'],
    touch: ['Hold the right half of the screen for gas, the left half for brake'],
  },
  instructions: {
    objective: 'Complete as many deliveries as possible.',
    howToPlay: [
      'Drive right to the green DEPOT flag before the clock runs out.',
      'Crates slide when the truck tilts, accelerates, brakes or lands hard.',
      'A crate that slides off either end of the bed is lost.',
      'Arrive with at least one crate to complete the delivery and start a longer route.',
      'Rolling the truck, losing every crate or running out of time ends the game.',
    ],
    scoring: '500 points per crate delivered, plus 10 per second left and a level bonus.',
    difficultyNotes: 'Higher difficulty makes the roads hillier.',
    tips: ['Feather the gas going uphill: crates slide backwards on steep climbs.', 'Brake gently before the crest of a hill, not after.'],
    touchNotes: ['Use short, gentle presses rather than holding full gas.'],
  },
  achievements: [
    ['level-3', 'Reliable Courier', 'Complete 3 deliveries in one game.', 3, '🚚', 15],
    ['level-6', 'Trucking Legend', 'Complete 6 deliveries in one game.', 6, '🏆', 30],
    ['total', 'Logistics Empire', 'Deliver 200 crates in total.', 200, '🎖️', 30],
  ],
  load: () => import('./TruckDrivingGame'),
});
