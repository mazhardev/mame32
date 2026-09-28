import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'hidden-object',
  title: 'Hidden Object',
  category: 'puzzle',
  difficulty: 'easy',
  icon: '🔎',
  tags: ['observation', 'search', 'seek and find', 'timed', 'relaxing'],
  short: 'Search a cluttered room for every item on your list before time runs out.',
  full: 'A classic seek-and-find game. A room is scattered with dozens of everyday things — keys, socks, shells, trumpets and more — at different sizes and angles. Find every item on your list, each hidden exactly once among the clutter. Every room is arranged fresh, so no two games are the same.',
  minutes: 3,
  controls: {
    mouse: ['Click an item from the list when you spot it'],
    touch: ['Tap an item from the list when you spot it'],
    keyboard: ['Use the Hint button to highlight an item'],
  },
  instructions: {
    objective: 'Find every item on the list.',
    howToPlay: [
      'The list above the room shows what to look for. Each listed item appears exactly once.',
      'Tap an item to collect it: it is ringed in green and crossed off the list.',
      'Tapping the wrong thing costs 3 seconds. A hint briefly highlights an item and costs 10 seconds.',
    ],
    scoring:
      '120 points per item, plus 5 per second left if you find them all, minus 20 per wrong tap and 80 per hint.',
    difficultyNotes:
      'Easy: 6 items in a light clutter, 2 minutes. Normal: 8 items, 2½ minutes. Hard: 10 small items in a packed room, 3 minutes.',
    tips: [
      'Sweep the room in strips rather than jumping around.',
      'Items can be tilted — look for their outline, not their usual angle.',
    ],
    touchNotes: ['Zoom the page with two fingers if you need a closer look.'],
  },
  achievements: [
    ['first', 'Finder', 'Find everything in a room.', 1, '🔎', 10],
    ['sharp', 'Sharp Eyes', 'Clear a room with no wrong taps and no hints.', 1, '🦉', 25],
    ['hard', 'Treasure Seeker', 'Clear a room on Hard.', 1, '🗝️', 30],
    ['ten', 'Collector', 'Clear 10 rooms.', 10, '🧺', 30],
  ],
  load: () => import('./HiddenObjectGame'),
});
