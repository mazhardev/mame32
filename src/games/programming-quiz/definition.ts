import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'programming-quiz',
  title: 'Programming Quiz',
  category: 'educational',
  difficulty: 'hard',
  icon: '💻',
  tags: ['quiz', 'coding'],
  short: 'Web basics, data structures, algorithms and coding trivia.',
  full: 'A quiz for coders and learners: HTML and CSS, JavaScript and Python basics, data structures, Big-O, HTTP, Git and computing history.',
  minutes: 4,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Answer ten programming questions.',
    question: 'Questions range from web basics to algorithms and JavaScript quirks.',
    difficulty:
      'Easy: acronyms and basics. Normal: data structures, HTTP and complexity. Hard: language quirks and deeper concepts.',
    tips: [
      'Stacks are LIFO, queues are FIFO.',
      'Binary search halves the search space each step: O(log n).',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
