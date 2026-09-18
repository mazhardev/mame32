import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective: 'Score seven points before the computer does.',
  howToPlay: [
    'Press Start game.',
    'Move your paddle (left, blue) to return the ball.',
    'Where the ball hits the paddle changes its angle; long rallies speed the ball up.',
    'You score when the ball passes the computer paddle.',
  ],
  scoring: '100 points for every goal you score. First to seven ends the match.',
  difficultyNotes: 'The computer paddle tracks at 170 px/s on Easy, 230 on Normal and 300 on Hard.',
  tips: [
    'Hit with the edge of the paddle for steep angles.',
    'Drift back to the centre after each return.',
  ],
  touchNotes: [
    'Drag across the court or hold the Up/Down buttons',
  ],
};
