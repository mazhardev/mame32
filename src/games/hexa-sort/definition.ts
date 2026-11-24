import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'hexa-sort',
  title: 'Hexa Sort',
  category: 'puzzle',
  difficulty: 'easy',
  icon: '⬢',
  tags: ['sort', 'stack', 'colors', 'merge', 'relaxing', 'high score'],
  short: 'Place stacks of coloured hexagons. Matching colours slide together and ten of a kind clear.',
  full: 'A soothing stack-and-sort puzzle in the style of the hexagon sorting games that took over mobile app charts. Take a stack of coloured hexagon tiles from the tray and place it on the honeycomb board. Any neighbouring stacks with the same colour on top slide their tiles onto it, and once ten or more of one colour sit on top they clear in a burst of points. One placement can set off a chain of slides and clears. A new colour joins every thirty stacks, and the game ends when there is no room left for the next stack. For more sorting try [Water Sort](game:water-sort) and [Ball Sort](game:ball-sort), or see all [block games](hub:block-games).',
  minutes: 6,
  hasSaveState: true,
  controls: {
    keyboard: ['Tab to a stack in the tray and press Enter to pick it', 'Tab to an empty cell and press Enter to place it'],
    mouse: ['Click a stack in the tray, then an empty cell'],
    touch: ['Tap a stack in the tray, then an empty cell'],
  },
  instructions: {
    objective: 'Clear as many tiles as you can before the board fills up.',
    howToPlay: [
      'Pick one of the three stacks in the tray and place it on an empty cell.',
      'Neighbouring stacks with the same top colour slide those tiles onto the new stack.',
      'When ten or more tiles of one colour sit on top of a stack, they clear.',
      'Clearing changes the stacks around it, which can set off more slides and clears.',
      'A new tray arrives when all three stacks are used. The game ends when there is no empty cell left.',
    ],
    scoring:
      'Each tile placed scores 1. Each cleared tile scores 10, multiplied by its place in the chain: the second clear in one move scores double, the third triple.',
    difficultyNotes: 'Easy starts with three colours, Normal with four and Hard with five. A colour is added every thirty stacks, up to eight.',
    tips: [
      'Keep one colour per area of the board so runs build up.',
      'Place a stack next to as many matching tops as possible.',
      'Leave a couple of cells free: a full board ends the game.',
    ],
    touchNotes: ['Tap a stack in the tray, then tap an empty cell to place it.'],
  },
  achievements: [
    ['clears', 'Sorted', 'Clear 10 stacks of tiles.', 10, '⬢', 10],
    ['chain', 'Chain Reaction', 'Clear two or more stacks with one placement.', 1, '💥', 20],
    ['k1', 'Thousand Club', 'Score 1,000 points in one game.', 1, '🎯', 20],
    ['k5', 'Hive Mind', 'Score 5,000 points in one game.', 1, '🏆', 50],
  ],
  load: () => import('./HexaSortGame'),
});
