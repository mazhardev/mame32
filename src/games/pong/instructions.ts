import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective: 'Score seven points before the computer does.',
  howToPlay: [
    'Your paddle is at the bottom (blue); the computer plays from the top.',
    'Return the ball past the computer paddle to score.',
    'Where the ball meets your paddle sets its angle: hit it with the edge for a steep return.',
    'Every return speeds the ball up a little. After each point the ball is served again from the middle.',
  ],
  scoring: '100 points for every point you win. First to seven wins the match.',
  difficultyNotes:
    'The computer paddle moves faster, reacts sooner and aims better on Normal and Hard. On Easy it is slow and often a little off.',
  tips: [
    'Angled returns are hard for the computer to reach.',
    'Drift back to the middle after each return.',
  ],
  touchNotes: ['Drag anywhere on the court and your paddle follows your finger, or hold the ◀ ▶ buttons.'],
};
