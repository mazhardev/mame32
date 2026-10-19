import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'pip-quest',
  title: 'Pip Quest',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🦊',
  tags: ['platformer', 'adventure', 'side-scroller', 'jump', 'levels', 'bosses', 'worlds', 'retro'],
  short: 'A side-scrolling platform adventure: 20 levels, 5 worlds, power-ups and bosses.',
  full: 'Help Pip the fox run, jump and stomp across five worlds — Mossy Meadow, Glimmer Caves, Cloudtop Isles, Frostpine Peaks and Ember Keep. Bump lucky blocks for coins and power-ups, grow big with golden acorns, throw fire berries, grab a shooting star for invincibility, ride moving ledges over lava and slide down the flag pole at the end of every level. Each world ends in a keep guarded by a boss. Twenty levels, checkpoints, secrets and 1-ups to find.',
  minutes: 15,
  hasLevels: true,
  controls: {
    keyboard: ['← → or A D move', 'Space, ↑, W or Z jump — hold for a higher jump', 'Hold X or Shift to run', 'Tap X or Shift to throw a fire berry (fire form)'],
    touch: ['◀ ▶ move', '⤒ jump — hold for a higher jump', '🔥 hold to run, tap to throw fire berries'],
  },
  instructions: {
    objective: 'Reach the flag pole at the end of each level and beat the boss at the end of each world. Clear all 20 levels to get Pip home.',
    howToPlay: [
      'Run and jump through each level before the timer runs out. Hold jump to jump higher; run first to jump further.',
      'Jump on Grumblebugs, Shellby snails and Flitter bats to stomp them. Stomping a snail leaves its shell — kick it to knock out everything in its path.',
      'Never stomp a Prickle hedgehog or a Snapweed plant: knock them out with a fire berry, a kicked shell, or by bumping the block they stand on.',
      'Hit lucky blocks from below for coins and power-ups. Big Pip can smash bricks.',
      'Golden acorn: grow big (you can take one extra hit). Fire berry: throw fire with X or Shift. Shooting star: invincible for a few seconds. Green leaf: an extra life.',
      'Touching checkpoints means you restart from there if you lose a life. Lava, falling down a pit or the timer reaching zero costs a life whatever your size.',
      'Boss keeps: jump on the boss’s head to hurt it (fire berries help too) and dodge the fireballs it throws.',
    ],
    scoring:
      'Coins 200 (100 coins = extra life), stomps from 100 and doubling for each enemy stomped without landing, 1,000 per power-up, 5,000 per boss, up to 5,000 for grabbing the flag pole high, and 50 points per second left on the clock.',
    difficultyNotes: 'Easy: 5 lives, 400 seconds per level, slower enemies, weaker bosses. Normal: 3 lives, 300 seconds. Hard: 3 lives, 240 seconds, faster enemies and tougher bosses.',
    tips: [
      'Run-jump to clear the wide gaps — tap jump for small hops near enemies.',
      'Stomp several enemies in a row without touching the ground for big points and even extra lives.',
      'A kicked shell bounces back off walls. Stay out of its way!',
      'Fire bars spin at a steady speed: wait for the gap, then go.',
      'Unlocked worlds can be chosen from "Start at" above the game.',
    ],
    touchNotes: ['Use ◀ ▶ to move, ⤒ to jump, and 🔥 to run or throw fire. Full screen gives the biggest view.'],
  },
  achievements: [
    ['first', 'Off to Adventure', 'Clear your first level.', 1, '🦊', 10],
    ['boss', 'Keep Crasher', 'Beat a boss.', 1, '🏰', 25],
    ['flag', 'Top of the Pole', 'Grab the very top of a flag pole.', 1, '🚩', 15],
    ['combo', 'Bounce House', 'Stomp 5 enemies in a row without landing.', 5, '👟', 25],
    ['coins', 'Coin Collector', 'Collect 100 coins in one game.', 100, '🪙', 20],
    ['fire', 'Hot Stuff', 'Knock out 25 enemies with fire berries.', 25, '🔥', 20],
    ['champion', 'Home Sweet Home', 'Clear all 20 levels.', 1, '🏆', 100],
    ['flawless', 'Nine Tails', 'Clear all 20 levels without losing a life.', 1, '👑', 150],
  ],
  load: () => import('./PipQuestGame'),
});
