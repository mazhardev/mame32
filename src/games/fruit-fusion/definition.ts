import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'fruit-fusion',
  title: 'Fruit Fusion',
  category: 'arcade',
  difficulty: 'easy',
  icon: '🍉',
  tags: ['merge', 'physics', 'fruit', 'drop', 'high score', 'casual'],
  short: 'Drop fruit into the jar. Two of a kind fuse into a bigger fruit: can you grow a watermelon?',
  full: 'The fruit-merging puzzle that took the internet by storm, rebuilt with original art. Drop fruit into a jar, where they tumble and settle like real objects. When two fruits of the same kind touch, they fuse into the next size up: cherries into strawberries, then grapes, limes, oranges, apples, pears, peaches, pineapples, melons and finally a giant watermelon. Bigger fusions score more, and fusions can set off chains. Plan where each fruit lands, because the game ends if the pile stays above the line at the top. For more merging try [Number Merge 2048](game:number-merge-2048) and [Hexa Sort](game:hexa-sort), or see all [block games](hub:block-games).',
  minutes: 6,
  controls: {
    keyboard: ['Arrow Left / Right (or A, D) to aim', 'Space or Arrow Down to drop', 'P to pause, R to restart'],
    mouse: ['Move the pointer to aim and click to drop'],
    touch: ['Slide your finger to aim and let go to drop', 'Or use ◀ ▶ and Drop'],
  },
  instructions: {
    objective: 'Fuse fruit into bigger and bigger kinds and score as many points as you can before the jar overflows.',
    howToPlay: [
      'Aim the fruit at the top of the jar and drop it.',
      'Two fruits of the same kind that touch fuse into the next kind up.',
      'The order runs cherry, strawberry, grape, lime, orange, apple, pear, peach, pineapple, melon, watermelon.',
      'Two watermelons pop for a big bonus.',
      'If any fruit stays above the dashed line for about two seconds, the game is over. The line turns red as a warning.',
    ],
    scoring: 'Each fusion scores the points of the fruit it makes, from 3 for a strawberry up to 66 for a watermelon. Two watermelons together score 264.',
    difficultyNotes: 'Easy hands you only the four smallest fruits, mostly the smallest. Normal adds oranges. Hard deals the first five kinds evenly, so big fruit arrive more often.',
    tips: [
      'Keep the big fruit to one side and build up in size from there.',
      'Drop a fruit next to its twin so they fuse straight away.',
      'Watch the next fruit in the corner and plan two drops ahead.',
    ],
    touchNotes: ['Put your finger anywhere on the jar, slide to aim and lift to drop.'],
  },
  achievements: [
    ['score', 'Fruit Salad', 'Score 1,000 points in one game.', 1000, '🍓', 20],
    ['merges', 'Juicer', 'Make 100 fusions in one game.', 100, '🍊', 20],
    ['peach', 'Peachy', 'Grow a peach.', 1, '🍑', 20],
    ['watermelon', 'Big Melon', 'Grow a watermelon.', 1, '🍉', 50],
  ],
  load: () => import('./FruitFusionGame'),
});
