import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective:
    'Steer the snake around the board, eat as much food as you can, and avoid running into your own tail.',
  howToPlay: [
    'The snake moves forward on its own — you only choose which way it turns.',
    'Each piece of food adds one segment and one point.',
    'The snake speeds up as your score climbs.',
    'On Easy the snake wraps around the edges; on Normal and Hard the walls are deadly.',
    'The game ends when the snake hits itself or a wall.',
  ],
  scoring: 'One point per piece of food. Your best score per difficulty is saved on this device.',
  difficultyNotes:
    'Easy uses a 20x20 board with wrap-around walls and a gentle speed curve. Normal is 22x22 with solid walls. Hard is a larger 26x26 board that starts fast and accelerates every three points.',
  tips: [
    'Keep to the outside early on and leave the middle open for later.',
    'Plan one turn ahead — two quick taps are buffered, so you can set up a corner.',
    'When the tail gets long, follow it around rather than cutting across the board.',
  ],
  touchNotes: [
    'Swipe anywhere on the board to turn.',
    'Or use the on-screen direction pad below the board.',
  ],
};
