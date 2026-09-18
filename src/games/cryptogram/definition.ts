import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'cryptogram',
  title: 'Cryptogram',
  category: 'brain',
  difficulty: 'hard',
  icon: '🔐',
  tags: ['cipher', 'code', 'quotes', 'decode', 'logic'],
  short: 'Crack a secret code to reveal a famous saying.',
  full: 'A classic substitution cipher: every letter in a famous proverb or quotation has been swapped for a different letter. Use letter patterns and short words to work out the code and reveal the message.',
  minutes: 8,
  controls: {
    keyboard: ['Type a letter to decode the selected code letter', 'Backspace clears it'],
    mouse: ['Click a code letter, then a key'],
    touch: ['Tap a code letter, then a key'],
  },
  instructions: {
    objective: 'Decode every letter to reveal the hidden saying.',
    howToPlay: [
      'Each small letter is part of the code; the space above it is your guess.',
      'Select a code letter and type the real letter it stands for. Every copy updates at once.',
      'A red guess means you have used that letter twice — one of them is wrong.',
      'Green letters are confirmed (given at the start or from a hint).',
      'No letter ever stands for itself.',
    ],
    scoring: '1,000 points, minus 120 per hint and 2 per second taken (minimum 100).',
    difficultyNotes:
      'Easy: short sayings with 4 letters given. Normal: 2 letters given. Hard: longer quotations with nothing given.',
    tips: [
      'One-letter words are almost always A or I.',
      'Common three-letter words: THE, AND, YOU.',
      'A letter after an apostrophe is often S or T.',
    ],
  },
  achievements: [
    ['first', 'Codebreaker', 'Crack your first cryptogram.', 1, '🔐', 10],
    ['no-hints', 'Pure Logic', 'Crack a cryptogram without hints.', 1, '🧠', 20],
    ['fast', 'Speed Decoder', 'Crack a cryptogram in under two minutes.', 1, '⚡', 20],
  ],
  load: () => import('./CryptogramGame'),
});
