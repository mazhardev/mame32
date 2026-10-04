import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'cannon-battle',
  title: 'Cannon Battle',
  category: 'action',
  difficulty: 'medium',
  icon: '🏰',
  tags: ['artillery', 'two player', 'physics', 'ai', 'action'],
  short: 'Turn-based artillery: set angle and power, beat the wind and flatten the enemy castle.',
  full: 'Two castles, one hill between them. Take turns lobbing cannonballs: choose an angle and power, check the wind, and fire. Shells blow craters in the ground, and a castle takes damage from any blast close by. Knock out three hearts to win. Play against a computer gunner that calculates its shots, or against a friend on the same device.',
  minutes: 4,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['↑ ↓ change the angle', '← → change the power', 'Space fires'],
    mouse: ['Press near your castle and drag: direction is the angle, distance is the power; release to fire'],
    touch: ['Drag from your castle and release to fire, or use the pad and Fire'],
  },
  instructions: {
    objective: 'Destroy the other castle before yours falls.',
    howToPlay: [
      'Players take turns. On your turn, set the barrel angle and the shot power.',
      'The wind (shown at the top) pushes shells sideways and changes a little every turn.',
      'A shell that explodes near a castle costs it one heart; a direct hit costs two.',
      'Explosions dig craters, which can open a path or lower a castle.',
    ],
    scoring: 'Beating the computer scores 300, plus 150 per heart you kept and a bonus for winning in few shots.',
    difficultyNotes: 'The computer’s aim error shrinks from Easy to Hard.',
    tips: ['Change one thing at a time between shots and watch where the shell lands.', 'High arcs are affected more by wind.'],
    touchNotes: ['Drag from your own castle towards the sky; the further you drag, the harder you shoot.'],
  },
  achievements: [
    ['win', 'Siege Master', 'Beat the computer.', 1, '🏰', 15],
    ['untouched', 'Impregnable', 'Beat the computer without losing a heart.', 1, '🛡️', 25],
    ['hard', 'Royal Artillery', 'Beat the computer on Hard.', 1, '🏆', 30],
    ['wins', 'Castle Collector', 'Beat the computer 10 times.', 10, '🎖️', 30],
  ],
  load: () => import('./CannonBattleGame'),
});
