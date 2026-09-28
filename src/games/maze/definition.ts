import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'maze',
  title: 'Maze',
  category: 'puzzle',
  difficulty: 'easy',
  icon: '🌐',
  tags: ['navigation', 'generated', 'labyrinth', 'relaxing'],
  short: 'Find your way through a freshly generated maze to the exit flag.',
  full: 'A new labyrinth every time. Guide the red marker from the top-left corner to the green flag in the bottom-right. Step cell by cell, or swipe to dash along a corridor to the next junction. Beat the par time, take the shortest route, and use "Show the way" only if you are truly lost.',
  minutes: 3,
  controls: {
    keyboard: ['Arrow keys or WASD step one cell', 'Shift + arrow runs to the next junction'],
    mouse: ['Drag across the maze in a direction to run that way'],
    touch: ['Swipe to run along a corridor', 'Use the on-screen pad for single steps'],
  },
  instructions: {
    objective: 'Reach the green flag in the bottom-right corner.',
    howToPlay: [
      'You start in the top-left corner. Walls block your way; open gaps let you through.',
      'A single key press moves one cell. A swipe (or Shift + arrow) keeps running until the corridor branches.',
      'Your trail is shaded so you can see where you have already been.',
      '"Show the way" draws the route from where you stand for 2.5 seconds.',
    ],
    scoring:
      '4 points per maze cell, minus 3 per second over par, 1.5 per step beyond the shortest route and 120 per hint. Minimum 50.',
    difficultyNotes: 'Easy: 10×10. Normal: 16×16. Hard: 22×22.',
    tips: [
      'Following one wall with your hand always gets you out of a maze like this — but rarely by the shortest route.',
      'Scan backwards from the exit to spot the corridor that leads to it.',
    ],
    touchNotes: ['Swipe to dash along corridors; tap the pad arrows for single steps.'],
  },
  achievements: [
    ['first', 'Way Out', 'Escape your first maze.', 1, '🚩', 10],
    ['perfect', 'Straight Shooter', 'Escape using exactly the shortest route.', 1, '🎯', 20],
    ['fast', 'Speed Runner', 'Escape a 16×16 maze in under 45 seconds.', 1, '⚡', 25],
    ['hard', 'Labyrinth', 'Escape a 22×22 maze.', 1, '🏛️', 20],
    ['no-hints', 'Own Compass', 'Escape a 22×22 maze without showing the way.', 1, '🧭', 30],
    ['ten', 'Maze Runner', 'Escape 10 mazes.', 10, '🏃', 30],
  ],
  load: () => import('./MazeGame'),
});
