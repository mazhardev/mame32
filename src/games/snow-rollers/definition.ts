import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'snow-rollers',
  title: 'Snow Rollers',
  category: 'arcade',
  difficulty: 'medium',
  icon: '☃️',
  tags: ['platformer', 'arena', 'snowball', 'stages', 'bosses', 'retro', 'combo'],
  short: 'Pack monsters into snowballs and roll them into each other — 30 stages and 3 bosses.',
  full: 'Yuki the yeti must clear the snow kingdom of mischievous monsters. Throw snow at them until they are packed into a giant snowball, then kick it: the ball rolls, bounces off the walls and flattens every monster in its path for huge chain combos. Defeated monsters drop treats and magic potions for speed, power, range or a burst of Super Yuki. Thirty single-screen stages across Frosty Glade, Twilight Ridge and Ember Glacier, with a boss at the end of each land. Dawdle too long and a ghost comes looking for you.',
  minutes: 12,
  hasLevels: true,
  controls: {
    keyboard: ['← → or A D move', 'Space, ↑, W or Z jump', 'X, Shift or J throw snow / kick a snowball', '↓ + jump drop through a ledge'],
    touch: ['◀ ▶ move', '⤒ jump', '❄ throw snow / kick a snowball'],
  },
  instructions: {
    objective: 'Clear every monster from each stage. Beat the bosses on stages 10, 20 and 30 to save the snow kingdom.',
    howToPlay: [
      'Throw snow at a monster to freeze it in place. Four hits pack it into a full snowball.',
      'Snow melts after a while, so act fast. Walk into a snowball to push it, or press throw right next to it to kick it.',
      'A kicked snowball rolls, bounces off walls and drops off ledges, flattening every monster it touches. The more it flattens, the bigger the points.',
      'Monsters drop treats for points and potions: red is speed, blue is stronger snow, yellow is longer throws, and green turns you into Super Yuki for a few seconds.',
      'You can jump up through ledges. Hold ↓ and press jump to drop down through one.',
      'Bosses can only really be hurt by rolling snowballs — turn the minions they summon into ammunition.',
      'Take too long on a stage and an unstoppable ghost appears. Clear the stage to make it go away.',
    ],
    scoring: 'Snow hits 10, a monster flattened by a snowball 500 — doubling for each extra one the same ball hits (up to 8,000). Treats 100–2,000, bosses 10,000, stage clear 1,000 (3,000 if under 30 seconds). Extra life every 50,000 points.',
    difficultyNotes: 'Easy: 5 lives, slower monsters, snow melts slowly, weaker bosses. Normal: 3 lives. Hard: 3 lives, faster monsters, snow melts quickly, tougher bosses.',
    tips: [
      'Line monsters up on the same floor, then kick one ball through them all.',
      'A ball kicked off a ledge keeps rolling on the floor below.',
      'Potions are lost when you lose a life — play carefully once you have them.',
      'Unlocked lands can be chosen from "Start at" above the game.',
    ],
    touchNotes: ['Use ◀ ▶ to move, ⤒ to jump and ❄ to throw snow or kick a ball.'],
  },
  achievements: [
    ['first', 'Snow Day', 'Clear your first stage.', 1, '❄️', 10],
    ['combo', 'Avalanche', 'Flatten 3 monsters with one snowball.', 3, '☃️', 25],
    ['boss', 'Boss on Ice', 'Beat a boss.', 1, '🏔️', 25],
    ['giant', 'Super Yuki', 'Drink a green potion.', 1, '🟢', 15],
    ['stages', 'Snowed Under', 'Clear 15 stages in one game.', 15, '🌨️', 30],
    ['score', 'Snow Millionaire', 'Score 200,000 points in one game.', 200000, '💎', 40],
    ['champion', 'Snow Champion', 'Clear all 30 stages.', 1, '🏆', 100],
  ],
  load: () => import('./SnowRollersGame'),
});
