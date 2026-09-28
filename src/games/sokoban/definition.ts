import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'sokoban',
  title: 'Sokoban',
  category: 'puzzle',
  difficulty: 'hard',
  icon: '📦',
  tags: ['pushing', 'boxes', 'warehouse', 'levels', 'logic', 'classic'],
  short: 'Push every crate onto a storage spot — you can push, but never pull.',
  full: 'The classic warehouse puzzle. Walk the keeper around the room and push crates onto the marked storage spots. Crates can only be pushed, one at a time, never pulled — so a crate shoved into a corner is stuck for good. Forty-five original rooms in three packs, each with a known minimum number of pushes.',
  minutes: 6,
  hasLevels: true,
  hasSaveState: true,
  controls: {
    keyboard: ['Arrow keys or WASD walk and push', 'Z or U undoes a step'],
    mouse: ['Click a floor square to walk there', 'Click a crate next to the keeper to push it'],
    touch: [
      'Swipe or use the direction pad to step',
      'Tap a floor square to walk there, or a neighbouring crate to push it',
    ],
  },
  instructions: {
    objective: 'Get every crate onto a storage spot (the green rings).',
    howToPlay: [
      'Walk into a crate to push it one square, if the square beyond it is free.',
      'You cannot pull crates or push two at once.',
      'A crate pushed into a corner away from a spot can never be recovered — the board warns you, and Undo takes it back.',
      'Each level shows the fewest pushes it can be solved in. Match it for three stars.',
    ],
    scoring:
      '40 points per push in the best solution plus 200, minus 20 per extra push and a little for every step walked.',
    difficultyNotes:
      'Easy: two crates. Normal: three crates. Hard: three or four crates with longer routes.',
    tips: [
      'Before pushing, check the square behind the crate: you must be able to stand there.',
      'A crate against a wall can only slide along that wall — make sure a spot lies that way.',
      'Solve the crate that is hardest to reach first.',
    ],
    touchNotes: ['Tap anywhere you can reach to walk there automatically; swipe to step and push.'],
  },
  achievements: [
    ['first', 'Warehouse Worker', 'Solve your first Sokoban room.', 1, '📦', 10],
    ['optimal', 'Efficient Mover', 'Solve a room in the fewest possible pushes.', 1, '⭐', 25],
    ['hard', 'Heavy Lifting', 'Solve a Hard room.', 1, '🏋️', 30],
    ['twenty', 'Logistics Pro', 'Solve 20 rooms.', 20, '🚚', 40],
    ['pack', 'Stock Take', 'Solve every room in one pack.', 1, '🏆', 50],
  ],
  load: () => import('./SokobanGame'),
});
