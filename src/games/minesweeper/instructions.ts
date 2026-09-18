import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective: 'Reveal every square that does not hide a mine, using the numbers as clues.',
  howToPlay: [
    'Click or tap a square to reveal it. Your first click is always safe.',
    'A number tells you how many mines touch that square, including diagonally.',
    'Right-click, or switch to Flag mode on touch, to mark a square you believe holds a mine.',
    'Click a revealed number that already has the right count of flags around it to open all its other neighbours at once.',
    'Reveal every safe square to win. Hit a mine and the run ends.',
  ],
  scoring:
    'Your score comes from squares cleared and how quickly you finish, scaled by board size. Best times are stored per difficulty.',
  difficultyNotes:
    'Easy is a 9x9 board with 10 mines. Normal is 16x16 with 40 mines. Hard is a wide 24x16 board with 70 mines.',
  tips: [
    'Start from numbers along the edge of an opened area — they have fewer unknown neighbours.',
    'If a 1 already touches one flag, every other neighbour is safe.',
    'The chord shortcut is far faster than clicking squares one at a time.',
  ],
  touchNotes: [
    'Tap to reveal a square.',
    'Switch to Flag mode in the toolbar, then tap to place or remove a flag.',
    'Long-press a square to flag it without changing mode.',
  ],
};
