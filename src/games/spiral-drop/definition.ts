import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'spiral-drop',
  title: 'Spiral Drop',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🌀',
  tags: ['tower', 'drop', 'rotate', 'levels', 'one finger'],
  short: 'Twist the tower so the bouncing ball drops through the gaps — never onto red.',
  full: 'Guide a bouncing ball all the way down a tall spiral tower. Turn the tower left and right so the ball falls through the gaps in each ring. Landing on red ends the run — but fall through three rings in a row and the ball powers up to smash through whatever it hits next. Reach the golden base to clear the level.',
  minutes: 3,
  hasLevels: true,
  controls: {
    keyboard: ['← / → turn the tower'],
    mouse: ['Hold the button and drag left or right'],
    touch: ['Drag left or right on the game'],
  },
  instructions: {
    objective: 'Reach the bottom of as many towers as possible.',
    howToPlay: [
      'The ball bounces on its own. Turn the tower so a gap is under the ball.',
      'Landing on a red section ends the game.',
      'Dropping through three or more rings in a row powers the ball up (it turns pink): the next ring it touches shatters, even if it is red.',
      'Each level adds more rings and more red.',
    ],
    scoring: 'Each ring passed scores the level number × your current drop streak. Clearing a level adds 10 × the level.',
    difficultyNotes: 'Easy: fewer red sections. Hard: many more red sections.',
    tips: ['Line up the next gap while the ball is still in the air.', 'Long streaks score big and give you a free smash.'],
    touchNotes: ['Drag sideways anywhere on the game to spin the tower.'],
  },
  achievements: [
    ['level-3', 'Going Down', 'Reach level 3.', 3, '🌀', 15],
    ['level-8', 'Spiral Master', 'Reach level 8.', 8, '🏆', 40],
    ['smash', 'Wrecking Ball', 'Smash through 5 rings in one game.', 5, '💥', 25],
    ['rings', 'Freefall', 'Pass 1,000 rings in total.', 1000, '⬇️', 30],
  ],
  load: () => import('./SpiralDropGame'),
});
