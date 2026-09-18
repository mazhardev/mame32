import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective: 'Move all 52 cards to the four foundations.',
  howToPlay: [
    'Build tableau columns down in alternating colours.',
    'Only a King can move into an empty column.',
    'Build foundations up by suit from Ace to King.',
    'Draw from the stock when you run out of moves.',
  ],
  scoring: 'Points for cards moved to the foundations; a win moves every card home.',
  difficultyNotes: 'Rules are the same on every difficulty.',
  tips: [
    'Turn over face-down tableau cards as early as possible.',
    'Do not empty a column unless a King can move into it.',
  ],
  touchNotes: [
    'Tap a card, then tap the destination pile',
    'Tap the stock to draw',
  ],
};
