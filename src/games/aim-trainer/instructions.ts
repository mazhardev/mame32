import type { GameInstructions } from '@/types';
export const instructions: GameInstructions = {
  objective: 'Hit targets quickly and accurately before time runs out.',
  howToPlay: [
    'Start a 30-second round.',
    'Tap or click each target. It immediately moves to a new position.',
    'Misses lower your accuracy bonus. Keyboard practice is available with Tab and Enter on the target.',
  ],
  scoring: '100 points per hit plus hits multiplied by your rounded accuracy percentage.',
  difficultyNotes: 'Easy targets are 72px, Normal 58px, and Hard 44px.',
};
