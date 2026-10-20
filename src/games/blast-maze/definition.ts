import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'blast-maze',
  title: 'Blast Maze',
  category: 'arcade',
  difficulty: 'medium',
  icon: '💣',
  tags: ['maze', 'bombs', 'arcade', 'battle', 'bosses', 'stages', 'power-ups', 'retro'],
  short: 'Drop bombs to blast through 40 maze stages and 5 bosses — or battle three bomb-happy bots.',
  full: 'Dig the mole drops bombs to clear a path through the maze. Blast the soft blocks to uncover power-ups and the hidden exit, knock out every monster, then make for the exit before time runs out. Collect extra bombs, bigger blasts, speed, remote detonators, kicking boots and more across 40 stages in five areas, each ending in a boss fight. In Battle mode, take on three computer bombers in an arena packed with power-ups: last bomber standing wins the round, first to three rounds wins the match.',
  minutes: 15,
  hasLevels: true,
  controls: {
    keyboard: ['Arrow keys or WASD move', 'Space, Z or J drop a bomb', 'X, Shift or K set off remote bombs'],
    touch: ['Use the pad to move', '💣 drops a bomb', '📡 sets off remote bombs'],
  },
  instructions: {
    objective: 'Adventure: defeat every monster on the stage and walk onto the exit. Battle: be the last bomber standing in three rounds.',
    howToPlay: [
      'Drop a bomb and get out of the way: it explodes in a cross after a couple of seconds. Grey walls stop the blast; soft blocks crumble.',
      'Blasts set off any other bombs they reach, so chain reactions can catch you out.',
      'Power-ups hidden in blocks: 💣 one more bomb at a time, 🔥 a longer blast, 👟 faster running, 📡 remote bombs you set off yourself, 👢 kick bombs along, a ghost to walk through blocks, a shield for a few seconds of safety, and a heart for an extra life.',
      'The exit is hidden under a block too. It opens once every monster is gone — but blasting it lets more monsters out!',
      'When the timer runs out, unstoppable ghosts come looking for you.',
      'Every eighth stage is a boss: blast it again and again until it falls, then take the exit.',
      'Battle mode: three bots race you for the power-ups. When the clock runs out the walls close in.',
    ],
    scoring: 'Monsters 100–1,000 points, doubled for every extra monster caught in the same blast. Power-ups 1,000, blocks 10, bosses 10,000 and up, plus 20 points for every second left when you leave a stage. Extra life at 20,000 points and every 40,000 after.',
    difficultyNotes: 'Easy: 5 lives, slower monsters, weaker bosses and calmer bots. Normal: 3 lives. Hard: 3 lives, faster monsters, tougher bosses and sharp, aggressive bots.',
    tips: [
      'Always know your escape route before you drop a bomb — corners make good shelters.',
      'Lure monsters into long corridors, then catch several in one blast for big points.',
      'Remote bombs let you wait for the perfect moment.',
      'Unlocked areas can be chosen from "Start at" above the game.',
    ],
    touchNotes: ['Use the pad to move, 💣 to drop bombs and 📡 to set off remote bombs.'],
  },
  achievements: [
    ['first', 'Kaboom!', 'Clear your first stage.', 1, '💣', 10],
    ['chain', 'Chain Reaction', 'Catch 3 monsters in one blast.', 3, '💥', 25],
    ['fire', 'Firestorm', 'Power your blast up to full range.', 8, '🔥', 25],
    ['boss', 'Boss Buster', 'Beat a boss.', 1, '👑', 25],
    ['round', 'Last One Standing', 'Win a battle round.', 1, '🥇', 15],
    ['battle', 'Battle Champion', 'Win a battle match.', 1, '🏆', 40],
    ['champion', 'Maze Master', 'Clear all 40 adventure stages.', 1, '🎖️', 100],
  ],
  load: () => import('./BlastMazeGame'),
});
