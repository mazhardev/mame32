import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'color-tap',
  title: 'Color Tap',
  category: 'casual',
  difficulty: 'easy',
  icon: '🌈',
  tags: ['reflex', 'colours', 'brain', 'quick', 'casual'],
  short: 'Read the colour word and tap the matching swatch — before the bar runs out.',
  full: 'A fast colour-reflex game with a twist. A colour name flashes up; tap the swatch of that colour before the timer bar empties. Easy is straightforward, but on Normal the word is sometimes printed in the wrong colour, and on Hard it always is — your brain wants to tap the ink, not the word. That is the famous Stroop effect.',
  minutes: 2,
  controls: {
    keyboard: ['Number keys 1–6 pick a swatch (left to right, top to bottom)'],
    mouse: ['Click a swatch'],
    touch: ['Tap a swatch'],
  },
  instructions: {
    objective: 'Tap the right colour as many times as you can before losing three lives.',
    howToPlay: [
      'Read the colour word shown in the panel.',
      'Tap the swatch with that colour. Ignore the colour the word is written in.',
      'A wrong tap, or running out of time, costs a life.',
      'The time window shrinks as your streak grows.',
    ],
    scoring: '10 points per correct tap, up to 10 more for speed, plus a streak bonus every five in a row.',
    difficultyNotes: 'Easy: four swatches, matching ink. Normal: the ink is sometimes wrong. Hard: six shuffling swatches, the ink is always wrong and less time.',
    tips: ['Say the word in your head rather than looking at its colour.', 'On Hard, find the word’s swatch again each round: they move.'],
    touchNotes: ['Swatches react on touch-down, so a light tap is enough.'],
  },
  achievements: [
    ['streak-20', 'Colour Sense', 'Get 20 right in a row.', 20, '🌈', 15],
    ['score-500', 'Chromatic', 'Score 500 points in one game.', 500, '🏆', 25],
    ['hard-10', 'Stroop Survivor', 'Get 10 in a row on Hard.', 10, '🧠', 25],
    ['total', 'Rainbow Master', 'Tap 1,000 correct colours in total.', 1000, '🎖️', 30],
  ],
  load: () => import('./ColorTapGame'),
});
