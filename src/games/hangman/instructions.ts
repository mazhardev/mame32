import type { GameInstructions } from '@/types';
export const instructions: GameInstructions = {
  objective: 'Reveal the entire hidden word.',
  howToPlay: [
    'Use the category clue to narrow down the hidden word.',
    'Choose letters with the buttons or keyboard. Use buttons for P, R and F because those keys belong to the toolbar.',
    'Reveal every letter before making six incorrect guesses.',
  ],
  scoring: 'A win earns 100 points plus 50 for each unused incorrect guess.',
  difficultyNotes: 'Harder settings include longer words.',
};
