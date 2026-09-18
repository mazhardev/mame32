import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'typing-challenge',
  title: 'Typing Challenge',
  category: 'word',
  difficulty: 'medium',
  icon: '🌧️',
  tags: ['typing', 'arcade', 'falling words', 'keyboard'],
  short: 'Type the falling words before they hit the ground.',
  full: 'An arcade typing game. Words rain down the screen — type each one to blast it before it reaches the red line. The more you clear, the faster and longer the words get.',
  minutes: 4,
  controls: {
    keyboard: ['Type any falling word — it disappears as soon as it is complete'],
    touch: ['Tap the box and type with your phone keyboard'],
  },
  instructions: {
    objective: 'Clear as many falling words as you can before you run out of lives.',
    howToPlay: [
      'Start typing to begin. Words fall from the top of the screen.',
      'Type a word exactly; it vanishes the moment you finish it — no Enter needed.',
      'The word you are typing is highlighted.',
      'Each word that reaches the red line costs a life.',
    ],
    scoring:
      '10 points per letter, multiplied by your combo (×2 after 5 words in a row, up to ×5).',
    difficultyNotes:
      'Easy: 5 lives and slow words. Normal: 3 lives. Hard: 3 lives, faster words and quicker spawns.',
    tips: ['Deal with the lowest words first.', 'A miss resets your combo multiplier.'],
  },
  achievements: [
    ['cleared', 'Word Blaster', 'Clear 40 words in one game.', 40, '🌧️', 15],
    ['score', 'High Speed', 'Score 3,000 points.', 3000, '🚀', 15],
    ['combo', 'Combo King', 'Clear 20 words in a row.', 20, '🔥', 20],
  ],
  load: () => import('./TypingChallengeGame'),
});
