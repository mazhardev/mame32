import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'math-racing',
  title: 'Math Racing',
  category: 'educational',
  difficulty: 'medium',
  icon: '🏁',
  tags: ['maths', 'speed', 'race'],
  short: 'Race a computer car: every right answer moves your car forward.',
  full: 'A maths race. Each correct answer moves your car along the track, while the computer car drives on at a steady pace. Reach the finish line first to win.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Answer 12 questions correctly before the computer car reaches the finish line.',
    question: 'Answer arithmetic questions as fast as you can; a wrong answer costs you time.',
    timed: 'There is no per-question timer, but the computer car never stops.',
    questions: 'The race ends when either car crosses the line.',
    difficulty:
      'Easy: simple sums and a computer car that takes 90 seconds. Normal: harder sums, 60 seconds. Hard: all four operations, 40 seconds.',
    tips: [
      'Speed matters more than perfection, but wrong answers pause you briefly.',
      'Keep your fingers on 1–4 to answer from the keyboard.',
    ],
  }),
  achievements: quizAchievements(1500),
  load: () => import('./Game'),
});
