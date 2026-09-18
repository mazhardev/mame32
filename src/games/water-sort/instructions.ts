import type { GameInstructions } from '@/types';
export const instructions: GameInstructions = {
  objective: 'Sort all colors into separate, full tubes.',
  howToPlay: [
    'Choose a source tube and then a destination.',
    'You can pour only onto the same top color or into an empty tube.',
    'A pour moves the matching top run until the destination is full.',
    'Finish with every nonempty tube full of one color. Undo is available and counts as a move.',
    'Unfinished puzzles save automatically. Choose Continue game when you return.',
  ],
  scoring: '500 points per color minus 10 per move, with a minimum winning score of 100.',
  difficultyNotes:
    'Easy has 3 colors, Normal 5, and Hard 7. All generated boards have a verified reverse path to a solution.',
};
