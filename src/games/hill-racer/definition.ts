import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'hill-racer',
  title: 'Hill Racer',
  category: 'racing',
  difficulty: 'medium',
  icon: '⛰️',
  tags: ['physics', 'terrain', 'fuel', 'hills', 'racing'],
  short: 'Drive a bouncy jeep over endless hills — manage your fuel and never land on your roof.',
  full: 'A physics driving game over rolling, ever-steeper hills. Your jeep has real suspension: it bounces, catches air off crests and can tip over if you are careless. Fuel runs down as you drive, so grab the red fuel cans along the way. In mid-air, the gas pedal tips the nose up and the brake tips it down, letting you line up a clean landing. Collect coins and see how far you can get.',
  minutes: 4,
  controls: {
    keyboard: ['→ or ↑ gas', '← or ↓ brake / reverse'],
    mouse: ['Hold the right half of the play area for gas, the left half for brake'],
    touch: ['Hold the right half of the screen for gas, the left half for brake'],
  },
  instructions: {
    objective: 'Drive as far as possible before you run out of fuel or flip over.',
    howToPlay: [
      'Gas drives forwards; the brake slows you and reverses when stopped.',
      'Fuel drains faster while you hold the gas. Fuel cans refill the tank.',
      'In the air, gas rotates the jeep backwards and brake rotates it forwards.',
      'If the driver’s head touches the ground, the run ends.',
      'Long jumps (over a second in the air) earn bonus points.',
    ],
    scoring: 'One point per 10 m, 10 per coin, and a bonus for big air.',
    difficultyNotes: 'Higher difficulty burns fuel faster and makes the hills steeper.',
    tips: ['Ease off the gas over crests so you do not launch too high.', 'Land with both wheels together for a smooth touchdown.'],
    touchNotes: ['Use two thumbs: right for gas, left for brake.'],
  },
  achievements: [
    ['m-500', 'Hill Climber', 'Drive 500 m.', 500, '⛰️', 15],
    ['m-1500', 'Mountain Goat', 'Drive 1,500 m.', 1500, '🏆', 30],
    ['air', 'Hang Time', 'Stay in the air for 2 seconds.', 1, '🪂', 20],
    ['total', 'Off-Road Legend', 'Drive 20,000 m in total.', 20000, '🎖️', 30],
  ],
  load: () => import('./HillRacerGame'),
});
