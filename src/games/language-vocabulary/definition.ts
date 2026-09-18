import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'language-vocabulary',
  title: 'Language Vocabulary',
  category: 'educational',
  difficulty: 'medium',
  icon: '🗣️',
  tags: ['vocabulary', 'quiz'],
  short: 'Learn Spanish, French and German words with quick translation questions.',
  full: 'Build vocabulary in three languages. Translate everyday words into English, and on harder levels, from English into Spanish, French and German.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Translate ten words correctly.',
    question: 'Translate a Spanish, French or German word into English — or the other way round.',
    difficulty:
      'Easy: common words, foreign to English only. Normal: more words and English to foreign. Hard: harder vocabulary in both directions.',
    tips: [
      'Many words share roots: “libro” and “livre” both mean book.',
      'German nouns always start with a capital letter.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
