import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'idle-miner',
  title: 'Idle Miner',
  category: 'strategy',
  difficulty: 'easy',
  icon: '⛏️',
  tags: ['idle', 'mining', 'bottleneck', 'incremental', 'save', 'economy'],
  short: 'Dig deeper shafts, upgrade the elevator and warehouse, and always fix the bottleneck.',
  full: 'Run a mine from a single stone shaft down to diamond seams. Shafts dig ore, the elevator lifts it to the surface and the warehouse trucks it to market — and your income is only as fast as the slowest of the three. Watch for the red outline, upgrade the bottleneck, and dig deeper for richer ore. The mine saves automatically and keeps working while you are away.',
  minutes: 20,
  hasSaveState: true,
  controls: {
    keyboard: ['Tab to an upgrade and press Enter or Space'],
    mouse: ['Click upgrade and dig buttons'],
    touch: ['Tap upgrade and dig buttons'],
  },
  instructions: {
    objective: 'Sell the target value of ore.',
    howToPlay: [
      'Each shaft digs ore into its own stockpile. Deeper shafts dig ore worth far more.',
      'The elevator carries ore up from the shafts; the deeper your mine, the longer each trip.',
      'The warehouse sells ore from the surface.',
      'The slowest stage is outlined in red — that is where your next upgrade does the most good.',
    ],
    scoring: 'Reaching the goal faster scores more.',
    difficultyNotes:
      'Easy: $2 million goal and 20% cheaper upgrades. Normal: $20 million. Hard: $200 million with 25% dearer upgrades.',
    tips: [
      'A new shaft is a huge jump in ore — but check the elevator can keep up.',
      'Stockpiles that keep growing mean the elevator or warehouse is too slow.',
    ],
    touchNotes: ['Everything is a button; take your time.'],
  },
  achievements: [
    ['shafts', 'Going Deeper', 'Dig 4 shafts.', 4, '⛏️', 15],
    ['elevator', 'Express Lift', 'Upgrade the elevator to level 20.', 20, '🛗', 20],
    ['million', 'Mining Millionaire', 'Sell $1 million of ore.', 1, '💰', 20],
    ['diamond', 'Diamond Seam', 'Dig all 8 shafts.', 1, '💎', 35],
  ],
  load: () => import('./IdleMinerGame'),
});
