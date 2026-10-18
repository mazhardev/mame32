import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'snowball-rumble',
  title: 'Snowball Rumble',
  category: 'arcade',
  difficulty: 'medium',
  icon: '☃️',
  tags: ['snow', 'arena', 'platformer', 'retro', 'bosses', 'combo', 'single-screen'],
  short: 'Freeze enemies into snowballs and roll them through the whole floor — 30 floors and three bosses.',
  full: 'Pebble the penguin climbs a frozen tower one single-screen floor at a time. Throw snow at the goblins, hoppers, fire imps and bats until they are packed into snowballs, then kick a snowball and watch it roll off ledges and bounce off walls, knocking out every enemy in its path for bigger and bigger scores. Knocked-out enemies turn into treats and the odd magic potion: red for speed, blue for bigger snowballs, yellow for longer throws and green for a few seconds of invincibility. Dawdle and the enemies get angry — dawdle longer and a gloom cloud comes for you. Every tenth floor a boss calls in minions: freeze them and roll them into it. Thirty floors across three zones, from Frosty Foothills to the Crystal Summit.',
  minutes: 10,
  hasLevels: true,
  controls: {
    keyboard: ['← / → or A / D walk', 'Space, ↑ or Z jump', 'X or C throw snow — hold to keep throwing', '↓ drop through a ledge'],
    mouse: ['Use the keyboard to play'],
    touch: ['◀ ▶ walk', '⤒ jump', '❄ throw snow (hold to keep throwing)'],
  },
  instructions: {
    objective: 'Clear every enemy from each floor and climb all thirty floors to the summit.',
    howToPlay: [
      'Throw snow at an enemy to cover it. A partly covered enemy is stuck and harmless for a moment; four hits pack it into a full snowball.',
      'Hit a snowball with another throw (or push it, then throw) to send it rolling. It rolls off ledges and bounces off walls, knocking out every enemy it touches and setting other snowballs rolling too.',
      'Knocked-out enemies drop treats for points, and sometimes a potion: red makes you faster, blue makes bigger snowballs, yellow throws further and green makes you invincible for a few seconds. Potions last until you lose a life.',
      'Touching an enemy that has no snow on it costs a life, and so do fire imps’ fireballs.',
      'Take too long and the enemies turn red and speed up. Take longer still and an unbeatable gloom cloud drifts after you.',
      'Every tenth floor is a boss. It keeps calling in minions — freeze them and roll them into the boss.',
    ],
    scoring:
      'Each hit of snow scores 10 and a full snowball 100. A rolling snowball scores 500 for its first knockout and doubles for each one after that. Treats are worth 200 to 2,000, bosses 10,000. An extra life every 40,000 points.',
    difficultyNotes: 'Easy: 5 lives, slower enemies and a longer wait before they get angry. Normal: 3 lives. Hard: faster enemies, they get angry sooner, and bosses are tougher.',
    tips: [
      'Freeze an enemy on a high ledge and kick it off: it will roll down through every floor below.',
      'Line enemies up before you kick — every knockout in a row doubles the score.',
      'A snowball cracks and lets its enemy out after a few seconds, so roll it before then.',
      'Fire imps only shoot along their own floor. Jump when one turns your way.',
    ],
    touchNotes: ['Use ◀ ▶ to walk, ⤒ to jump and ❄ to throw snow. Hold ❄ to keep throwing.'],
  },
  achievements: [
    ['first', 'First Flurry', 'Clear your first floor.', 1, '❄️', 10],
    ['roll3', 'Snowball Sweep', 'Knock out 3 enemies with one rolling snowball.', 3, '⛄', 20],
    ['roll5', 'Avalanche', 'Knock out 5 enemies with one rolling snowball.', 5, '🏔️', 40],
    ['troll', 'Troll Toppler', 'Defeat the Frost Troll.', 1, '🧌', 30],
    ['djinn', 'Fire Douser', 'Defeat the Ember Djinn.', 1, '🔥', 40],
    ['king', 'Summit Champion', 'Defeat the Storm King.', 1, '👑', 80],
    ['potions', 'Mixologist', 'Drink all four potions in one run.', 4, '🧪', 30],
    ['frozen', 'Big Chill', 'Freeze 50 enemies in one run.', 50, '🧊', 30],
    ['runs', 'Snow Day', 'Play 10 runs.', 10, '🛷', 15],
  ],
  load: () => import('./SnowballRumbleGame'),
});
