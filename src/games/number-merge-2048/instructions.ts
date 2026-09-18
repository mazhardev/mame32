import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective:
    'Slide numbered tiles together to merge matching pairs and build the biggest number you can.',
  howToPlay: [
    'Use the arrow keys, WASD or a swipe to slide every tile in one direction.',
    'Two tiles with the same number merge into one tile of double the value.',
    'A new 2 or 4 appears after every move that changes the board.',
    'The run ends when the board is full and no merges remain.',
    'Undo steps back one move — you get a limited number per run.',
  ],
  scoring:
    'Each merge adds the value of the new tile to your score. Reaching the target tile awards a large bonus.',
  difficultyNotes:
    'Easy uses a roomier 5x5 board and a 1024 target. Normal is the classic 4x4 board with a 2048 target and three undos. Hard is 4x4 with a 4096 target and no undos.',
  tips: [
    'Pick one corner and never move the tiles out of it.',
    'Keep your largest tile anchored and build a descending row next to it.',
    'Avoid moving in the direction that would lift your big tile out of its corner.',
  ],
  touchNotes: ['Swipe up, down, left or right anywhere on the board.'],
};
