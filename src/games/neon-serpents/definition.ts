import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'neon-serpents',
  title: 'Neon Serpents',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🐍',
  tags: ['snake', 'arena', 'grow', 'neon', 'io', 'boost', 'survival'],
  short: 'Slither around a neon arena, eat to grow longer, and make rival snakes crash into you.',
  full: 'Guide a glowing serpent around a neon arena full of computer snakes. Eat pellets to grow longer and climb the leaderboard. Any snake whose head touches another snake’s body bursts into a shower of pellets, so cut in front of rivals, circle them, and feast on what they leave behind. Boost to dash ahead, but boosting sheds length as you go. Keep clear of the arena wall and other snakes’ bodies, and see how big you can get.',
  minutes: 5,
  controls: {
    mouse: ['Your snake heads toward the mouse pointer', 'Hold the mouse button to boost'],
    keyboard: ['← → steer', 'Space or ↑ (hold) to boost'],
    touch: ['Touch and drag: the snake heads toward your finger', 'Hold the Boost button (or a second finger) to boost'],
  },
  instructions: {
    objective: 'Grow as long as you can without your head touching another snake or the wall.',
    howToPlay: [
      'Your snake always moves forward and turns toward the pointer or your finger. Big snakes turn more slowly.',
      'Eat the glowing pellets to grow. Burst snakes leave big, bright pellets behind.',
      'If your head touches another snake’s body, you burst. If another snake’s head touches yours, the smaller one bursts.',
      'Boost for speed, but it sheds length, leaving a trail of pellets behind you.',
      'Trap rivals: get in front of them so they run into your body, or coil around them.',
      'The red ring is the arena wall. Touching it ends your run.',
    ],
    scoring: 'Your score is the longest length you reached. The leaderboard shows the five longest snakes in the arena.',
    difficultyNotes: 'Easy: 10 slower-witted snakes that rarely chase you. Normal: 14 snakes. Hard: 18 sharp snakes that like to cut you off.',
    tips: [
      'Stay away from the heads of big snakes, and give their bodies room when they turn.',
      'A quick boost across a rival’s path is the classic way to knock it out.',
      'The pellets a big snake leaves behind are a feast. Get there first.',
    ],
    touchNotes: ['Drag your finger to steer: the snake heads toward it from the middle of the screen. Hold the Boost button or put a second finger down to boost.'],
  },
  achievements: [
    ['long', 'Growing Up', 'Reach a length of 200.', 200, '🐍', 10],
    ['giant', 'Neon Giant', 'Reach a length of 1,000.', 1000, '🐉', 50],
    ['kill', 'Cut Off', 'Knock out 3 snakes in one game.', 3, '✂️', 20],
    ['top', 'Top Serpent', 'Reach #1 on the leaderboard.', 1, '👑', 40],
  ],
  load: () => import('./NeonSerpentsGame'),
});
