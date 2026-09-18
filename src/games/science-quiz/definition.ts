import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'science-quiz',
  title: 'Science Quiz',
  category: 'educational',
  difficulty: 'medium',
  icon: '🔬',
  tags: ['quiz', 'science'],
  short: 'Space, the human body, physics, chemistry and nature.',
  full: 'A general science quiz covering the solar system, human biology, physics, chemistry and the natural world.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Answer ten science questions.',
    question: 'Questions come from across the sciences.',
    difficulty:
      'Easy: primary-school science. Normal: secondary-school topics. Hard: harder physics, biology and astronomy.',
    tips: [
      'Venus, not Mercury, is the hottest planet.',
      'Units are named after scientists: newton, ohm, watt.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
