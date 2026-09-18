import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective:
    'Drop discs into the grid and be the first to line up four of your colour horizontally, vertically or diagonally.',
  howToPlay: [
    'Click or tap a column to drop your disc into the lowest free slot.',
    'Red always moves first.',
    'Play against the computer or pass the device for two players.',
    'The board fills from the bottom, so think about what you are opening up above.',
  ],
  scoring:
    'Winning scores 100 plus a bonus for finishing quickly, multiplied by difficulty. A draw scores 25.',
  difficultyNotes:
    'Easy looks one move ahead and sometimes plays at random. Normal searches four moves deep. Hard searches six moves deep with a positional heuristic that values the centre columns and blocks your threats early.',
  tips: [
    'Claim the centre column — it takes part in the most possible lines.',
    'Watch for setups that give your opponent two winning squares at once.',
    'Counting parity matters: on a full board the odd and even rows favour different players.',
  ],
  touchNotes: ['Tap anywhere in a column to drop a disc there.'],
};
