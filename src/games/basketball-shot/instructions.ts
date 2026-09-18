import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective: 'Score as many points as you can before the shot clock runs out.',
  howToPlay: [
    'Drag back from anywhere on the court, like a slingshot. The arrow shows your angle and power.',
    'Release to shoot. The ball bounces off the rim, backboard and floor.',
    'After each shot you move to a new spot. Later shots are taken from further out.',
    'The round ends when the clock hits zero. A shot already in the air still counts.',
  ],
  scoring:
    '2 points per basket, 3 from behind the 3 PT mark. +1 for a swish (no rim) and +1 per basket while on a streak of 3 or more.',
  difficultyNotes:
    'Easy: 75 seconds and a long aiming guide. Normal: 60 seconds and a short guide. Hard: 45 seconds, no guide and a hoop that moves up and down.',
  tips: [
    'A high arc is more forgiving than a flat shot.',
    'Banking it off the backboard works well from close range.',
    'Use the keyboard for fine adjustments after dragging.',
  ],
  touchNotes: [
    'Drag back from the ball and release to shoot.',
    'The Angle and Power buttons nudge your aim; Shoot fires.',
  ],
};
