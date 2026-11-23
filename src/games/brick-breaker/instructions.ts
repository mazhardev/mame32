import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective: 'Clear all forty bricks before losing three balls.',
  howToPlay: [
    'The ball waits on your paddle: tap the court or press Space to launch it.',
    'Move the paddle under the ball to bounce it back up. Each brick breaks on contact.',
    'Where the ball meets the paddle sets its angle: near an edge sends it off steeply.',
    'The ball speeds up as the wall thins out. Losing it off the bottom costs a ball.',
  ],
  scoring:
    '50 points per brick, plus 10 for each row higher up, plus a combo bonus of up to 50 for breaking several bricks before the ball comes back to the paddle.',
  difficultyNotes: 'Easy has a wide paddle and a slower ball; Hard has a narrow paddle and a faster ball.',
  tips: [
    'Hit the ball near the paddle edge to aim it at the sides.',
    'Open a gap and let the ball bounce behind the wall for big combos.',
  ],
  touchNotes: ['Drag anywhere on the court and the paddle follows your finger; let go or tap to launch. The ◀ ▶ and Launch buttons work too.'],
};
