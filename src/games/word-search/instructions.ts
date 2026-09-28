import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective: 'Find all the listed words.',
  howToPlay: [
    'Look for a word from the list in the grid.',
    'Select its first letter, then its last letter.',
    'A correct selection highlights the word and crosses it off the list.',
  ],
  scoring: 'Points for every word found; finding them all wins the board.',
  difficultyNotes:
    'Easy: 8×8 grid, 5 words, all read forwards. Normal: 10×10, 7 words, some written backwards. Hard: 13×13, 10 words in any direction.',
  tips: ['Scan for uncommon letters first.', 'Check the diagonals once rows and columns are done.'],
  touchNotes: ['Tap the first letter, then the last letter of a word'],
};
