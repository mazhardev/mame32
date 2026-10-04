import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'stack-blocks',
  title: 'Stack Blocks',
  category: 'casual',
  difficulty: 'easy',
  icon: '🧱',
  tags: ['timing', 'stacking', 'one button', 'physics', 'casual'],
  short: 'Drop blocks from a swinging crane and build a tower that does not topple.',
  full: 'A crane swings a block back and forth on a rope. Release it at the right moment so it lands on top of your tower. Blocks that land off-centre stay where they fall, so a sloppy stack starts to lean — and if too much weight hangs over one side, the top of the tower comes crashing down. Line up perfect drops for bonus points.',
  minutes: 3,
  controls: {
    keyboard: ['Space or Enter releases the block'],
    mouse: ['Click to release'],
    touch: ['Tap to release'],
  },
  instructions: {
    objective: 'Build the tallest tower you can before you lose three blocks.',
    howToPlay: [
      'The block swings under the crane. Tap to drop it.',
      'It keeps some of the swing’s sideways speed as it falls, so release a little early.',
      'A block that misses the tower costs a life.',
      'If the blocks above any level lean too far over its edge, they topple and you lose a life.',
    ],
    scoring: '1 point per block, 2 for a perfect drop, and up to 5 for a chain of perfects.',
    difficultyNotes: 'Higher difficulty swings the crane faster and wider.',
    tips: ['Release as the block passes the middle of its swing, where it moves fastest but most predictably.', 'Fix a lean by dropping the next block slightly to the other side.'],
  },
  achievements: [
    ['height-15', 'Builder', 'Reach a tower height of 15.', 15, '🧱', 15],
    ['height-40', 'Skyscraper', 'Reach a tower height of 40.', 40, '🏆', 30],
    ['perfect-5', 'Plumb Line', 'Make 5 perfect drops in one game.', 5, '📏', 20],
    ['total', 'Master Mason', 'Stack 500 blocks in total.', 500, '🎖️', 30],
  ],
  load: () => import('./StackBlocksGame'),
});
