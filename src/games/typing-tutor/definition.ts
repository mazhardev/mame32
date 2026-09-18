import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'typing-tutor',
  title: 'Typing Tutor',
  category: 'educational',
  difficulty: 'easy',
  icon: '🎹',
  tags: ['touch typing', 'keyboard', 'lessons', 'learn'],
  short: 'Learn touch typing step by step, from the home row to full sentences.',
  full: 'Ten guided typing lessons. Start with the home row, add one reach at a time, and finish with real sentences. A colour-coded keyboard shows which finger to use for the next key. Progress is saved as you unlock lessons.',
  minutes: 5,
  hasLevels: true,
  hasSaveState: true,
  touch: false,
  controls: {
    keyboard: ['Type the highlighted character'],
    mouse: ['Choose a lesson from the list'],
  },
  instructions: {
    objective: 'Complete all ten lessons with the required accuracy.',
    howToPlay: [
      'Pick the next unlocked lesson.',
      'Place your fingers on the home row (A S D F and J K L ;).',
      'Type the highlighted character. The keyboard shows which finger to use by colour.',
      'Mistakes flash red; keep going until the text is done.',
      'Reach the target accuracy to unlock the next lesson.',
    ],
    scoring: 'Score = words per minute × accuracy.',
    difficultyNotes:
      'Easy: 85% accuracy and short lessons. Normal: 90%. Hard: 95% and longer lessons.',
    tips: ['Don’t look at your hands.', 'Accuracy first — speed comes with practice.'],
    touchNotes: ['Typing Tutor is designed for a physical keyboard.'],
  },
  achievements: [
    ['lessons', 'Halfway There', 'Pass five lessons.', 5, '🎹', 15],
    ['graduate', 'Touch Typist', 'Pass the final lesson.', 1, '🎓', 30],
    ['perfect', 'Perfect Lesson', 'Finish a lesson with 100% accuracy.', 1, '💯', 15],
  ],
  load: () => import('./TypingTutorGame'),
});
