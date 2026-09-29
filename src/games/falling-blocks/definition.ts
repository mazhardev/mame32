import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'falling-blocks',
  title: 'Falling Blocks',
  category: 'arcade',
  difficulty: 'medium',
  icon: '⬇️',
  tags: ['falling', 'dodge', 'survival', 'climb', 'platformer', 'blocks'],
  short: 'Dodge the blocks raining into the well, then climb them to escape the rising tide.',
  full: 'Blocks of every size tumble into a narrow well and pile up where they land. Don’t let one land on your head — but you’ll need them, because the tide is rising. Hop up the growing stack to stay above the water, and watch the shadows on the walls to see where the next blocks will fall. How high can you climb?',
  minutes: 4,
  controls: {
    keyboard: ['← / → or A / D run', '↑, W or Space jump'],
    touch: ['◀ ▶ buttons run, Jump button jumps'],
  },
  instructions: {
    objective: 'Survive as long as you can and climb as high as possible.',
    howToPlay: [
      'Blocks fall straight down and stop on whatever is below them.',
      'A block landing on your head squashes you. Standing right beside one is safe.',
      'You can jump up one block, but not two.',
      'You can ride a falling block down if you land on top of it.',
      'Red markers at the top of the screen and pale shadows show where blocks are falling.',
      'The water rises steadily — if it covers you, the game ends.',
    ],
    scoring: '10 points for every new metre (block) of height, and 25 points whenever a row fills from wall to wall.',
    difficultyNotes: 'Harder settings make blocks fall faster and more often, and the tide rise quicker.',
    tips: ['Stay near the top of the stack, but never directly under a shadow.', 'Wide blocks make good stairs.', 'Some blocks are aimed at you — keep moving.'],
    touchNotes: ['Hold ◀ or ▶ and tap Jump while running to hop up steps.'],
  },
  achievements: [
    ['height-20', 'Climber', 'Climb 20 metres.', 20, '🧗', 20],
    ['height-50', 'Summit Seeker', 'Climb 50 metres.', 50, '🏔️', 40],
    ['survive', 'Keep Your Head', 'Survive for 2 minutes.', 120, '⏱️', 30],
    ['rows', 'Bricklayer', 'Fill 50 rows in total.', 50, '🧱', 25],
  ],
  load: () => import('./FallingBlocksGame'),
});
