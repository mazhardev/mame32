import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'stack-tower',
  title: 'Stack Tower',
  category: 'arcade',
  difficulty: 'easy',
  icon: '🏗️',
  tags: ['timing', 'one button', 'stacking', 'endless', 'casual'],
  short: 'Drop sliding blocks to build the tallest tower — anything that overhangs gets sliced off.',
  full: 'A one-tap timing game. A block slides back and forth above your tower; tap to drop it. Any part that hangs over the edge is sliced off, so each imperfect drop leaves a narrower block to stack. Nail the timing for a perfect drop, and chain perfects to make your blocks grow again.',
  minutes: 2,
  controls: {
    keyboard: ['Space or Enter drops the block'],
    mouse: ['Click to drop the block'],
    touch: ['Tap to drop the block'],
  },
  instructions: {
    objective: 'Stack as many blocks as you can.',
    howToPlay: [
      'Drop the sliding block onto the tower.',
      'The part that does not overlap the block below falls away.',
      'Land within a few pixels for a perfect drop: the block keeps its full width.',
      'Three perfect drops in a row make the block grow back a little.',
      'Missing the tower completely ends the game.',
    ],
    scoring: 'One point per block stacked.',
    difficultyNotes: 'Easy: slow blocks. Hard: fast blocks that speed up quickly.',
    tips: ['Watch the edge of the block below, not the middle.', 'Blocks get faster as the tower grows — stay calm.'],
    touchNotes: ['Tap anywhere on the game.'],
  },
  achievements: [
    ['twenty', 'Builder', 'Stack 20 blocks.', 20, '🏗️', 15],
    ['fifty', 'Skyscraper', 'Stack 50 blocks.', 50, '🏙️', 40],
    ['perfect', 'Pixel Perfect', 'Make 8 perfect drops in a row.', 8, '✨', 30],
    ['blocks', 'Master Mason', 'Stack 500 blocks in total.', 500, '🧱', 30],
  ],
  load: () => import('./StackTowerGame'),
});
