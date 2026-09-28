import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'escape-maze',
  title: 'Escape Maze',
  category: 'puzzle',
  difficulty: 'medium',
  icon: '🚪',
  tags: ['navigation', 'timed', 'keys', 'dark', 'maze'],
  short: 'Escape five dark mazes by lamplight — find the keys before your time runs out.',
  full: 'Five mazes, one lamp, and a ticking clock. You can only see a small circle around you, so explore carefully: coloured doors block the way out until you find the matching key, and coins hidden in dead ends add bonus points. Each maze is bigger than the last.',
  minutes: 6,
  controls: {
    keyboard: ['Arrow keys or WASD step one cell', 'Shift + arrow runs to the next junction'],
    mouse: ['Drag across the maze to run in that direction'],
    touch: ['Swipe to run along a corridor', 'Use the on-screen pad for single steps'],
  },
  instructions: {
    objective: 'Escape all five mazes before the timer runs out on any of them.',
    howToPlay: [
      'Your lamp lights only the cells close to you. Places you have seen stay dimly mapped.',
      'A coloured bar across a passage is a locked door. Walk into it holding the key of the same colour to open it.',
      'Keys and coins are picked up by walking over them. Coins hide in dead ends.',
      'Reach the green flag to escape. Each maze has its own countdown.',
    ],
    scoring:
      'Each escape scores 100 × the maze number, plus 10 per second left and 50 per coin.',
    difficultyNotes:
      'Easy: wide lamp, generous time, doors from maze 3. Normal: smaller lamp, up to two doors. Hard: tiny lamp, tight time and up to three doors.',
    tips: [
      'Keys are usually tucked away from the direct route — check side passages near a locked door.',
      'Grab coins only when you have time to spare; the clock matters more.',
    ],
    touchNotes: ['Swipe to dash down corridors; the pad moves one cell at a time.'],
  },
  achievements: [
    ['first', 'Out of the Dark', 'Escape your first dark maze.', 1, '🚪', 10],
    ['coins', 'Treasure Hunter', 'Collect every coin in a maze and escape.', 1, '🪙', 20],
    ['quick', 'Plenty of Oil', 'Escape a maze with half the time still left.', 1, '🕯️', 20],
    ['run', 'Great Escape', 'Escape all five mazes in one run.', 1, '🏁', 30],
    ['hard', 'Night Walker', 'Escape all five mazes on Hard.', 1, '🌑', 50],
  ],
  load: () => import('./EscapeMazeGame'),
});
