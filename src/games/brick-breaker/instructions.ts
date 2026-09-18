import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective: 'Clear all forty bricks before losing three balls.',
  howToPlay: [
    'Press Start game.',
    'Move the paddle under the ball to bounce it back up.',
    'Each brick breaks on contact.',
    'Losing the ball off the bottom costs a life.',
  ],
  scoring: '50 points per brick; clearing the wall is worth 2,000 points.',
  difficultyNotes: 'One speed setting; the challenge is keeping all three balls.',
  tips: [
    'Hit the ball near the paddle edge to aim it at the sides.',
    'Open a gap and let the ball bounce behind the wall.',
  ],
  touchNotes: [
    'Drag across the court or hold the Left/Right buttons',
  ],
};
