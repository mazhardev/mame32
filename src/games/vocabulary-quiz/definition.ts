import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'vocabulary-quiz',
  title: 'Vocabulary Quiz',
  category: 'word',
  difficulty: 'medium',
  icon: '📚',
  tags: ['quiz', 'meaning'],
  short: 'What does it mean? Match words to their definitions.',
  full: 'Expand your English vocabulary. Choose the meaning of a word, or the word that matches a meaning — from everyday words to rare gems like “ephemeral”.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Match ten words and meanings.',
    question: 'Pick the meaning of a word, or the word for a meaning.',
    difficulty:
      'Easy: common descriptive words. Normal: richer vocabulary. Hard: advanced words such as “ubiquitous” and “laconic”.',
    tips: [
      'Look for familiar parts: “bene” means good, “mal” means bad.',
      'Rule out meanings that don’t fit the word type.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
