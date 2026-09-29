import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'maze-muncher',
  title: 'Maze Muncher',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🟡',
  tags: ['maze', 'dots', 'ghosts', 'chase', 'classic', 'retro'],
  short: 'Munch every dot in the maze while four ghosts give chase.',
  full: 'A maze-chase classic with an original maze and a gang of four ghosts, each with its own personality: Blaze hunts you directly, Petal tries to cut you off, Splash teams up with Blaze to pincer you and Sunny loses its nerve when it gets close. Eat a power pellet and the tables turn — the ghosts go blue and you can eat them for big points. Clear the maze to move on to a faster level.',
  minutes: 6,
  controls: {
    keyboard: ['Arrow keys or WASD steer'],
    touch: ['Use the direction pad, or hold a finger on the side of the muncher you want to go'],
  },
  instructions: {
    objective: 'Eat every dot in the maze without getting caught.',
    howToPlay: [
      'The muncher keeps moving until it hits a wall.',
      'Press a direction early and the muncher turns at the next opening.',
      'The side tunnel wraps you around to the other side of the maze — ghosts are slow in there.',
      'Power pellets turn the ghosts blue for a few seconds. Blue ghosts can be eaten; their eyes fly back to the house.',
      'Ghosts flash white just before they recover.',
      'You have 3 lives, and earn one extra life at 10,000 points.',
    ],
    scoring: '10 per dot, 50 per power pellet. Ghosts eaten during one pellet are worth 200, 400, 800 and 1,600. 1,000 bonus for clearing the maze.',
    difficultyNotes: 'Harder settings make the ghosts faster and shorten the time they stay blue. Every level is a little faster than the last.',
    tips: [
      'Save the power pellets until ghosts are close by.',
      'Ghosts change between roaming to their corners and hunting you — every change makes them turn around.',
      'Use the tunnel to shake off pursuers.',
    ],
    touchNotes: ['Touch and hold anywhere to the left, right, above or below the muncher to steer that way.'],
  },
  achievements: [
    ['clear', 'Clean Plate', 'Clear the maze.', 1, '🟡', 20],
    ['level-4', 'Maze Master', 'Reach level 4.', 4, '🏅', 35],
    ['score', 'Muncher Supreme', 'Score 15,000 points in one game.', 15000, '🏆', 35],
    ['ghosts', 'Ghost Gobbler', 'Eat 50 ghosts in total.', 50, '👻', 25],
  ],
  load: () => import('./MazeMuncherGame'),
});
