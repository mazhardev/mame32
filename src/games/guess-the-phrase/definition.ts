import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'guess-the-phrase',
  title: 'Guess the Phrase',
  category: 'word',
  difficulty: 'medium',
  icon: '💬',
  tags: ['phrases', 'idioms', 'proverbs', 'letters'],
  short: 'Reveal a hidden phrase one letter at a time, then solve it for a bonus.',
  full: 'Guess letters to reveal a hidden idiom, proverb or everyday phrase. Consonants earn prize points for every time they appear, vowels cost points, and wrong guesses cost lives. Solve the phrase early for a big bonus.',
  minutes: 6,
  controls: {
    keyboard: ['Type a letter to guess it'],
    mouse: ['Click letters on the keyboard', 'Click Solve to type the whole phrase'],
    touch: ['Tap letters on the keyboard', 'Tap Solve to type the whole phrase'],
  },
  instructions: {
    objective: 'Solve three hidden phrases and score as many points as you can.',
    howToPlay: [
      'The category tells you what kind of phrase it is.',
      'Guess a consonant: you earn the prize value for each time it appears.',
      `Vowels (A, E, I, O, U) cost 100 points each.`,
      'A letter that isn’t in the phrase costs a life.',
      'Press Solve and type the whole phrase to finish early — a wrong answer costs a life.',
    ],
    scoring:
      'Consonants earn the prize value (100–500) per letter. Solving pays 300 plus 50 for every letter still hidden. Rounds you fail earn nothing.',
    difficultyNotes:
      'Easy: 7 lives and short phrases. Normal: 5 lives. Hard: 4 lives and longer phrases.',
    tips: [
      'Start with common consonants like T, N, S and R.',
      'Solve as soon as you know it — hidden letters are worth a bonus.',
    ],
  },
  achievements: [
    ['first', 'Phrase Finder', 'Solve your first phrase.', 1, '💬', 5],
    ['score', 'Big Winner', 'Score 3,000 points in one game.', 3000, '💰', 15],
    ['all', 'Clean Sweep', 'Solve all three phrases in a game.', 1, '🏆', 20],
  ],
  load: () => import('./GuessThePhraseGame'),
});
