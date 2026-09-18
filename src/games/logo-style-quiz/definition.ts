import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'logo-style-quiz',
  title: 'Logo-Style Quiz',
  category: 'creative',
  difficulty: 'medium',
  icon: '🔰',
  tags: ['quiz', 'fictional-logos'],
  short: 'Match original fictional logos to the businesses they represent.',
  full: 'A visual logo quiz with original, made-up brands. Read each logo’s symbol and colour to work out what kind of business it belongs to. No real logos are used.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Match ten fictional logos and businesses.',
    question: 'Pick the company or business type a logo suggests, or the right logo for a company.',
    difficulty:
      'Easy: obvious symbols like a leaf or a coffee cup. Normal: adds more brands and “which logo fits” questions. Hard: more abstract symbols.',
    tips: [
      'The symbol usually shows what the business does.',
      'Colour helps too: blue for water, green for plants.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
