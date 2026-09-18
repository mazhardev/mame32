import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'speed-typing',
  title: 'Speed Typing',
  category: 'word',
  difficulty: 'easy',
  icon: '⌨️',
  tags: ['typing test', 'wpm', 'keyboard', 'speed'],
  short: 'A one-minute typing test: how many words per minute can you type?',
  full: 'Measure your typing speed and accuracy. Type the words as they appear, pressing Space after each one. After 60 seconds you get your words per minute (WPM) and accuracy.',
  minutes: 1,
  touch: true,
  controls: {
    keyboard: ['Type each word, then press Space'],
    touch: ['Tap the box and type with your phone keyboard'],
  },
  instructions: {
    objective: 'Type as many words correctly as you can in 60 seconds.',
    howToPlay: [
      'Click the box and start typing — the timer begins with your first letter.',
      'Press Space after each word to move on.',
      'Correct words turn green; mistakes turn red.',
      'After one minute you see your speed (WPM) and accuracy.',
    ],
    scoring:
      'Score = WPM × 10 × accuracy. A word counts as five characters, the standard for typing tests.',
    difficultyNotes:
      'Easy: short common words. Normal: longer common words. Hard: real sentences with capitals and punctuation.',
    tips: ['Accuracy first — speed follows.', 'Keep your eyes on the text, not your hands.'],
  },
  achievements: [
    ['wpm-30', 'Quick Fingers', 'Type 30 words per minute.', 30, '⌨️', 10],
    ['wpm-50', 'Speed Typist', 'Type 50 words per minute.', 50, '🚀', 20],
    ['wpm-70', 'Lightning Keys', 'Type 70 words per minute.', 70, '⚡', 30],
    ['flawless', 'Flawless', 'Type 20+ words with 100% accuracy.', 1, '💯', 20],
  ],
  load: () => import('./SpeedTypingGame'),
});
