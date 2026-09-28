import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'pipe-connect',
  title: 'Pipe Connect',
  category: 'puzzle',
  difficulty: 'medium',
  icon: '🔧',
  tags: ['rotation', 'flow', 'logic', 'pipes', 'network', 'plumber'],
  short: 'Rotate the pipe tiles until water from the centre reaches every tile without a leak.',
  full: 'A network puzzle. The tiles on the board make one connected system of pipes, but every tile has been turned. Rotate them so water from the source in the middle flows to every tile, with no open pipe ends. Lock the tiles you are sure of, and try to finish in the fewest turns.',
  minutes: 5,
  hasSaveState: true,
  controls: {
    keyboard: ['Arrow keys move the cursor', 'Enter or Space turns clockwise, Shift+Enter anticlockwise', 'L locks or unlocks a tile'],
    mouse: ['Left-click turns a tile clockwise, right-click anticlockwise', 'Use the Lock tool to protect finished tiles'],
    touch: ['Tap a tile to turn it clockwise', 'Switch on the Lock tool, then tap tiles to lock them'],
  },
  instructions: {
    objective: 'Connect every tile to the water source with no loose pipe ends.',
    howToPlay: [
      'Each tile can only be rotated, never moved.',
      'Tiles connected to the source fill with blue water; end tiles light up when water reaches them.',
      'The network has no loops: every tile is reached by exactly one route.',
      'Locked tiles cannot be turned until you unlock them.',
    ],
    scoring: '15 points per tile, minus 4 per turn beyond the fewest possible and 2 per second beyond par.',
    difficultyNotes: 'Easy: 5×5. Normal: 7×7. Hard: 9×9.',
    tips: [
      'Start at the edges: a pipe end can never point off the board.',
      'Corner tiles have very few legal orientations — fix and lock them first.',
      'A straight pipe on the edge must run along it.',
    ],
    touchNotes: ['Tap to turn. Use the Lock tool button to mark tiles you have solved.'],
  },
  achievements: [
    ['first', 'Plumbing Works', 'Solve your first pipe puzzle.', 1, '🔧', 10],
    ['perfect', 'Not a Turn Wasted', 'Solve a puzzle in the fewest possible turns.', 1, '🎯', 30],
    ['nine', 'Waterworks', 'Solve a 9×9 pipe puzzle.', 1, '🏗️', 30],
    ['ten', 'Master Plumber', 'Solve 10 pipe puzzles.', 10, '🚰', 30],
  ],
  load: () => import('./PipeGame'),
});
