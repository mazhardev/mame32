import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'idle-factory',
  title: 'Idle Factory',
  category: 'strategy',
  difficulty: 'easy',
  icon: '🏭',
  tags: ['idle', 'production chain', 'incremental', 'save', 'economy', 'factory'],
  short: 'Build a production line from ore to robots and keep every machine fed.',
  full: 'An idle factory with a real production chain. Drills dig ore, smelters turn ore into ingots, presses stamp gears, assemblers build engines and robot labs put it all together. Each machine only works when it has inputs, so the trick is balancing the line — too few drills and your smelters stand idle. Whatever no machine uses is sold automatically. Progress saves, and the factory keeps running at half speed while you are away.',
  minutes: 20,
  hasSaveState: true,
  controls: {
    keyboard: ['1–5 buy machines', 'Tab to the upgrade buttons'],
    mouse: ['Click machines and upgrades to buy them'],
    touch: ['Tap machines and upgrades to buy them'],
  },
  instructions: {
    objective: 'Build the target number of robots.',
    howToPlay: [
      'Each stage needs the stage before it: a smelter uses 2 ore per ingot, a press 3 ingots per gear, and so on.',
      'The Busy bar shows if a machine type is starved of input. Red or amber means buy more of the stage before.',
      'Everything a later stage does not use is sold for money.',
      'Upgrades double a machine’s speed or raise every sale price.',
    ],
    scoring: 'Reaching the robot goal faster scores more.',
    difficultyNotes:
      'Easy: 40 robots and machine prices rise slowly. Normal: 120 robots. Hard: 300 robots and steeper machine prices.',
    tips: [
      'Keep every Busy bar green before adding the next stage.',
      'Robot labs need lots of gears — both directly and inside engines.',
    ],
    touchNotes: ['All controls are buttons; there is no tapping race.'],
  },
  achievements: [
    ['gear', 'First Gear', 'Make your first gear.', 1, '⚙️', 10],
    ['robot', 'It’s Alive!', 'Build your first robot.', 1, '🤖', 20],
    ['drills', 'Drill Field', 'Own 50 drills.', 50, '⛏️', 20],
    ['balanced', 'Perfect Balance', 'Run all five stages with none starved.', 1, '⚖️', 30],
    ['upgrades', 'State of the Art', 'Buy every upgrade.', 1, '🏆', 30],
  ],
  load: () => import('./IdleFactoryGame'),
});
