import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'history-quiz',
  title: 'History Quiz',
  category: 'educational',
  difficulty: 'medium',
  icon: '📜',
  tags: ['quiz', 'history'],
  short: 'Ancient civilisations, world wars, explorers and inventions.',
  full: 'Travel through time with questions about ancient civilisations, empires, revolutions, explorers, inventions and the 20th century.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Answer ten history questions.',
    question: 'Questions cover world history from ancient times to the modern era.',
    difficulty:
      'Easy: famous events and people. Normal: dates and empires. Hard: harder dates, dynasties and details.',
    tips: [
      'Link events together: WWI began in 1914, WWII ended in 1945.',
      'Explanations after each answer add extra facts.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
