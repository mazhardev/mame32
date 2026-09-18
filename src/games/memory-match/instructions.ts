import type { GameInstructions } from '@/types';
export const instructions: GameInstructions = {
  objective: 'Match every symbol pair.',
  howToPlay: [
    'Flip two cards to reveal their symbols.',
    'Matching cards stay face up. Different cards turn back after a short delay.',
    'Find all pairs to win. You can use Tab and Enter on the cards.',
  ],
  scoring:
    'Each pair is worth 100 points. Every move beyond the minimum costs 25 points, with a minimum completed-board score of 10.',
  difficultyNotes: 'Easy has 6 pairs, Normal 8 pairs and Hard 12 pairs.',
};
