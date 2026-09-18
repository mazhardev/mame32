import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective: 'Fill the nine-by-nine grid so every row, every column and every three-by-three box contains the digits 1 to 9 exactly once.',
  howToPlay: [
    'Select a cell, then choose a digit from the number pad or type it.',
    'Given clues are shown in bold and cannot be changed.',
    'Switch to Notes mode to pencil in candidate digits.',
    'Conflicting entries are highlighted so mistakes are easy to spot.',
    'Use a hint to fill the selected cell with its correct value.',
    'Your progress is saved automatically — come back to it any time.',
  ],
  scoring:
    'Solving scores 1000 for Easy, 2000 for Normal and 3500 for Hard, minus a small penalty for each hint and mistake, plus a bonus for finishing quickly.',
  difficultyNotes:
    'Easy leaves 44 clues, Normal 34 and Hard 27. Every generated puzzle is verified to have exactly one solution, so no guessing is ever required.',
  tips: [
    'Scan for a digit that has only one possible cell left in a row, column or box.',
    'Use notes on cells with two candidates — pairs quickly eliminate options elsewhere.',
    'When you are stuck, look at the most-filled box rather than the emptiest one.',
  ],
  touchNotes: ['Tap a cell to select it, then tap a digit on the pad below the grid.'],
};
