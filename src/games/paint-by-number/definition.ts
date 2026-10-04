import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'paint-by-number',
  title: 'Paint by Number',
  category: 'creative',
  difficulty: 'easy',
  icon: '🔢',
  tags: ['colouring', 'relaxing', 'numbers', 'pixel', 'creative', 'save'],
  short: 'Fill each numbered square with its colour and watch a pixel picture appear.',
  full: 'A relaxing paint-by-number collection of twelve original pixel pictures — a fish, a rocket, a mushroom, a cat and more. Choose a numbered colour, then tap or drag across the squares with that number. Finished pictures go into your gallery, and an unfinished one is saved so you can come back to it.',
  minutes: 6,
  hasSaveState: true,
  controls: {
    keyboard: ['0–9 choose a colour number', 'Arrow keys move, Space paints'],
    mouse: ['Click a colour, then click or drag over its squares'],
    touch: ['Tap a colour, then tap or drag over its squares'],
  },
  instructions: {
    objective: 'Paint every square with the colour of its number.',
    howToPlay: [
      'Each number matches one colour swatch. 0 is the background.',
      'Select a number and paint all the squares showing it.',
      'A swatch fades when all of its squares are done.',
      'The picture is complete when every square is the right colour.',
    ],
    scoring: '1,000 points, minus 25 per mistake and 1 per second.',
    difficultyNotes:
      'Easy highlights the squares for the chosen number. Normal has no highlight and ignores wrong taps (but counts them). Hard paints wrong colours too, so you have to paint over your mistakes.',
    tips: [
      'Paint large areas first by dragging.',
      'Zoom your browser if the numbers are small on a phone.',
    ],
    touchNotes: ['Drag with one finger to paint lots of squares quickly.'],
  },
  achievements: [
    ['first', 'First Masterpiece', 'Finish a picture.', 1, '🖼️', 10],
    ['clean', 'Steady Hand', 'Finish a picture with no mistakes.', 1, '✋', 20],
    ['gallery', 'Collector', 'Finish 6 different pictures.', 6, '🏛️', 25],
    ['cells', 'Busy Brush', 'Paint 3,000 squares in total.', 3000, '🖌️', 20],
    ['hard', 'Perfectionist', 'Finish a picture on Hard with no mistakes.', 1, '🏆', 35],
  ],
  load: () => import('./PaintByNumberGame'),
});
