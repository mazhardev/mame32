import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'memory-sequence',
  title: 'Memory Sequence',
  category: 'brain',
  difficulty: 'medium',
  icon: '🔢',
  tags: ['memory', 'recall', 'span', 'numbers', 'brain'],
  short: 'Digits flash one by one — type them back. How long a sequence can you remember?',
  full: 'A digit-span memory test, the same idea psychologists use to measure working memory. Digits appear one at a time; when they stop, type the sequence back. Every correct answer adds another digit. Two misses at the same length end the test. On Hard you must type the digits backwards, which is much harder than it sounds.',
  minutes: 3,
  controls: {
    keyboard: ['Number keys type digits, Backspace deletes, Enter continues'],
    mouse: ['Click the on-screen keypad'],
    touch: ['Tap the on-screen keypad'],
  },
  instructions: {
    objective: 'Remember the longest sequence of digits you can.',
    howToPlay: [
      'Press Start and watch the digits appear one at a time.',
      'When they stop, type them back in the same order (backwards on Hard).',
      'Get it right and the next sequence is one digit longer.',
      'Two wrong answers at the same length end the test.',
    ],
    scoring: '100 points per digit in your longest correct sequence.',
    difficultyNotes: 'Easy: starts at 3 digits, shown slowly. Normal: starts at 4. Hard: starts at 3 but must be typed in reverse.',
    tips: ['Group digits into chunks of three, like a phone number.', 'Say them quietly in your head as they appear.'],
  },
  achievements: [
    ['span-7', 'Magic Seven', 'Recall 7 digits forwards or backwards.', 7, '7️⃣', 15],
    ['span-9', 'Steel Trap', 'Recall 9 digits.', 9, '🧠', 30],
    ['reverse-6', 'Rewind', 'Recall 6 digits backwards (Hard).', 6, '⏪', 25],
    ['tests', 'Memory Gym', 'Complete 20 tests.', 20, '🎖️', 20],
  ],
  load: () => import('./MemorySequenceGame'),
});
