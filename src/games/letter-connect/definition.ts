import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'letter-connect',
  title: 'Letter Connect',
  category: 'word',
  difficulty: 'easy',
  icon: '⭕',
  tags: ['letter wheel', 'relaxing', 'levels', 'find words'],
  short: 'Connect letters on a wheel to fill every hidden word slot.',
  full: 'A relaxing word puzzle. Each level gives you a wheel of letters and a set of hidden words. Tap letters in order to spell words and fill every slot. Find extra words for bonus points. Five levels per game.',
  minutes: 8,
  hasLevels: true,
  controls: {
    keyboard: ['Type letters from the wheel', 'Enter to submit, Backspace to undo'],
    mouse: ['Click letters in order, then Enter'],
    touch: ['Tap letters in order, then Enter'],
  },
  instructions: {
    objective: 'Find every hidden word in five levels.',
    howToPlay: [
      'Tap letters on the wheel in order to spell a word (each letter once).',
      'Press Enter. If it matches a hidden word, it fills that slot.',
      'Real words that aren’t in the slots count as bonus words.',
      'Fill every slot to clear the level. Shuffle rearranges the wheel to help you spot words.',
    ],
    scoring:
      '10 points per letter for hidden words, 5 per letter for bonus words and +100 per level cleared. Hints cost 15.',
    difficultyNotes:
      'Easy: 5-letter wheels with up to 8 words. Normal: 6-letter wheels, 10 words. Hard: 7-letter wheels, 12 words.',
    tips: [
      'The longest slot always uses every letter on the wheel.',
      'Try adding S or E to words you have found.',
    ],
  },
  achievements: [
    ['level', 'Wheel Master', 'Clear all five levels in one game.', 5, '⭕', 15],
    ['score', 'Word Collector', 'Score 1,500 points in one game.', 1500, '🏆', 15],
    ['no-hints', 'No Help Needed', 'Clear all five levels without hints.', 1, '🧠', 20],
  ],
  load: () => import('./LetterConnectGame'),
});
