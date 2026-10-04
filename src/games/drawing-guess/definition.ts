import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'drawing-guess',
  title: 'Drawing Guess',
  category: 'creative',
  difficulty: 'easy',
  icon: '🎨',
  tags: ['drawing', 'guessing', 'quick', 'pictures', 'creative', 'kids'],
  short: 'Watch a sketch appear line by line and name it before it’s finished.',
  full: 'The computer draws a picture one line at a time — a house, a kite, a snowman, a light bulb — and you guess what it is. The sooner you name it, the more points you score, but a wrong guess costs points and some answers look very alike. Ten sketches per game.',
  minutes: 3,
  controls: {
    keyboard: ['1–6 choose an answer'],
    mouse: ['Click an answer'],
    touch: ['Tap an answer'],
  },
  instructions: {
    objective: 'Name as many sketches as you can, as early as you can.',
    howToPlay: [
      'A sketch is drawn stroke by stroke.',
      'Choose its name from the answers at any moment.',
      'A wrong answer costs 20 points and is crossed out; keep guessing.',
      'If you cannot name it a few seconds after it is finished, the round ends.',
    ],
    scoring: 'Up to 100 points for an instant guess, down to 20 for a finished sketch.',
    difficultyNotes:
      'Easy offers 3 answers and draws slowly. Normal offers 4. Hard offers 6 — including lookalikes — and draws quickly.',
    tips: [
      'The first line drawn is the outline — it is often enough.',
      'Watch for the details that tell lookalikes apart.',
    ],
    touchNotes: ['The answer buttons are large and spaced for thumbs.'],
  },
  achievements: [
    ['first', 'Good Eye', 'Name a sketch.', 1, '👀', 5],
    ['fast', 'Lightning Guess', 'Name a sketch before a quarter of it is drawn.', 1, '⚡', 20],
    ['ten', 'Perfect Ten', 'Name all 10 sketches in one game.', 10, '🔟', 30],
    ['total', 'Art Critic', 'Name 100 sketches in total.', 100, '🖼️', 25],
    ['hard', 'Sharp-Eyed', 'Name 8 or more on Hard.', 1, '🏆', 35],
  ],
  load: () => import('./DrawingGuessGame'),
});
