import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'leap-quest',
  title: 'Leap Quest',
  category: 'arcade',
  difficulty: 'medium',
  icon: '⛰️',
  tags: ['platformer', 'adventure', 'levels', 'jumping', 'bosses', 'retro', 'side-scroller'],
  short: 'Run, jump and stomp through 16 side-scrolling levels and beat four guardians.',
  full: 'Pip the kiwi sets out across four worlds — Sunny Meadows, Glimmer Caves, Cloudtop Heights and Ember Peaks — to win back the star keys. Run and jump through 16 side-scrolling levels, stomp beetles and bees, kick snail shells into whole rows of enemies, bump gift blocks for gems and power-ups, ride moving platforms over bottomless gaps and time your way past fire wheels and lava. A guardian waits at the end of every world. Collect 100 gems for an extra life, and pick up from any level you have reached.',
  minutes: 10,
  hasLevels: true,
  controls: {
    keyboard: ['← / → or A / D run', 'Space, ↑ or Z jump — hold for a higher jump', 'X or C throw a spark (with the pepper power)', '↓ drop down through a ledge'],
    mouse: ['Use the keyboard to play'],
    touch: ['◀ ▶ run', '⤒ jump (hold for higher)', '✦ throw a spark'],
  },
  instructions: {
    objective: 'Reach the goal pole at the end of each level, and defeat the guardian at the end of each world.',
    howToPlay: [
      'Run with ← and →. Pip speeds up the longer you run, and running jumps go higher and further.',
      'Jump on enemies to stomp them. Hedgehogs are spiky — jump over them instead. Stomp a snail and it hides in its shell: touch the shell to send it sliding into other enemies.',
      'Jump into gift blocks from below for gems and power-ups. The red berry makes Pip big (one extra hit, and big Pip can break bricks), the pepper lets Pip throw bouncing sparks, the rainbow feather makes Pip invincible for a few seconds, and the green heart is an extra life.',
      'Pits, lava and the time limit cost a life. Being hit while big or powered up only shrinks Pip.',
      'Touch a checkpoint flag to restart from it if you lose a life. Grab the goal pole as high as you can for a bigger bonus.',
      'Each world ends in a fort with a guardian. Stomp it on the head several times (sparks also wear it down), then grab the star key.',
    ],
    scoring:
      'Stomps score 100 and double for every enemy you bounce on without landing. Gems are 50, gift power-ups 1,000, guardians 5,000. Higher grabs on the goal pole score up to 5,000, and every second left on the clock is worth 10.',
    difficultyNotes:
      'Easy: 5 lives, slower enemies and 400 seconds per level. Normal: 3 lives and 300 seconds. Hard: faster enemies, 240 seconds and tougher guardians.',
    tips: [
      'Hold jump for height, tap it for a short hop — you will need both.',
      'Kick a shell down a crowded corridor: every enemy it hits is worth more than the last.',
      'Fire wheels turn at a steady speed. Wait for the gap, then go.',
      'Big Pip can smash bricks for hidden shortcuts and gems.',
    ],
    touchNotes: ['Use ◀ ▶ to run, ⤒ to jump and ✦ to throw sparks. Full-screen mode gives you a bigger view.'],
  },
  achievements: [
    ['first', 'First Leap', 'Finish your first level.', 1, '🚩', 10],
    ['flawless', 'Untouched', 'Finish a level without getting hit.', 1, '✨', 20],
    ['chain', 'Bounce House', 'Stomp 4 enemies in a row without touching the ground.', 4, '👟', 25],
    ['shell', 'Shell Shock', 'Knock out 3 enemies with one kicked shell.', 3, '🐚', 25],
    ['gems', 'Gem Hoarder', 'Collect 100 gems in one run.', 100, '💎', 20],
    ['boar', 'Bramble Breaker', 'Defeat the Bramble Boar.', 1, '🐗', 30],
    ['mole', 'Crystal Clear', 'Defeat the Crystal Mole.', 1, '💠', 30],
    ['owl', 'Storm Chaser', 'Defeat the Storm Owl.', 1, '🦉', 40],
    ['golem', 'Valley Hero', 'Defeat the Magma Golem and finish the quest.', 1, '🏆', 80],
    ['runs', 'Adventurer', 'Play 10 runs.', 10, '🎒', 15],
  ],
  load: () => import('./LeapQuestGame'),
});
