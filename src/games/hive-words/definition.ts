import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'hive-words',
  title: 'Hive Words',
  category: 'word',
  difficulty: 'medium',
  icon: '🐝',
  tags: ['words', 'spelling', 'daily', 'honeycomb', 'vocabulary'],
  short: 'Make words from seven honeycomb letters. Every word must use the centre letter.',
  full: 'A daily word hunt in a honeycomb, in the spirit of the spelling-bee puzzles that word lovers solve each morning. Seven letters sit in a hive. Make as many words as you can of four letters or more, always using the golden centre letter; letters may be used more than once. Every hive hides at least one word that uses all seven letters, worth a big bonus. Climb the ranks from Beginner to Hive Master. A new hive arrives every day, and you can play a random hive whenever you like. Your progress on today’s hive is saved. For more word fun try [Five Letter Word](game:five-letter-word) or [Word Builder](game:word-builder), or see all [word guessing games](hub:word-guessing-games).',
  minutes: 8,
  hasSaveState: true,
  difficultyPicker: 'none',
  controls: {
    keyboard: ['Type the letters', 'Enter submits, Backspace deletes', 'Space shuffles the outer letters'],
    mouse: ['Click the hexagons to spell a word, then Enter'],
    touch: ['Tap the hexagons to spell a word, then Enter', '🔀 shuffles the outer letters'],
  },
  instructions: {
    objective: 'Find as many words as you can from the seven letters, each using the centre letter, and climb to Hive Master.',
    howToPlay: [
      'Words must be four letters or longer and must include the centre letter.',
      'Letters may be used more than once in a word.',
      'Proper nouns and words with letters outside the hive do not count.',
      'Every hive has at least one word using all seven letters: a full hive.',
      'Tap the counter under the rank bar to see every word you have found. Finish shows all the answers.',
    ],
    scoring:
      'A four-letter word scores 1 point; longer words score one point per letter. A full-hive word scores 7 extra. Rarer words that are not on the answer list still score, as bonus words.',
    difficultyNotes:
      'Ranks are a share of the hive’s total points: Good at 8%, Great at 40%, Genius at 70%, and Hive Master for every answer.',
    tips: [
      'Look for endings: -ing, -ed, -er and -tion turn one word into several.',
      'Shuffle the letters when you get stuck; new neighbours suggest new words.',
      'Hunt the full-hive word early: it is worth the most and often unlocks others.',
    ],
    touchNotes: ['Tap the hexagons to build a word, then Enter. Delete removes the last letter.'],
  },
  achievements: [
    ['words', 'Busy Bee', 'Find 50 words in total.', 50, '🐝', 20],
    ['pangram', 'Full Hive', 'Find a word that uses all seven letters.', 1, '🍯', 20],
    ['great', 'Great Hive', 'Reach the Great rank on a hive.', 1, '🌼', 20],
    ['genius', 'Hive Genius', 'Reach the Genius rank on a hive.', 1, '🧠', 40],
    ['master', 'Hive Master', 'Find every answer in a hive.', 1, '👑', 60],
  ],
  load: () => import('./HiveWordsGame'),
});
