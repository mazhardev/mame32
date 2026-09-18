import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'periodic-table-quiz',
  title: 'Periodic Table Quiz',
  category: 'educational',
  difficulty: 'hard',
  icon: '⚗️',
  tags: ['quiz', 'science', 'chemistry'],
  short: 'Chemical symbols, element names, atomic numbers and fun facts.',
  full: 'Learn the periodic table: match symbols to names, recall atomic numbers of the first twenty elements, and answer questions about famous elements.',
  minutes: 4,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Answer ten questions about chemical elements.',
    question: 'Match symbols and names, give atomic numbers, or answer element facts.',
    difficulty:
      'Easy: common elements like H, O, C, Fe and Au. Normal: adds more school-level elements. Hard: adds atomic numbers and rarer elements.',
    tips: [
      'Some symbols come from Latin: Fe (ferrum) is iron, Au (aurum) gold, Ag silver.',
      'Atomic number = number of protons.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
