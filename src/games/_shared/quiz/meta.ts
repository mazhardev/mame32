import type { GameControls, GameInstructions } from '@/types';
import type { AchievementSpec } from '../defineGame';

export const QUIZ_CONTROLS: GameControls = {
  keyboard: ['1–4 to pick an answer', 'Enter for the next question', 'P to pause, R to restart'],
  mouse: ['Click an answer'],
  touch: ['Tap an answer'],
};

interface QuizInstructionOptions {
  objective: string;
  /** What each question asks, in one sentence. */
  question: string;
  questions?: string;
  timed?: string;
  difficulty: string;
  tips?: string[];
}

export function quizInstructions(o: QuizInstructionOptions): GameInstructions {
  return {
    objective: o.objective,
    howToPlay: [
      'Choose a difficulty and press Start.',
      o.question,
      o.timed ?? 'Take your time: questions are not timed.',
      `${o.questions ?? 'Each round has 10 questions.'} You see the right answer after every question.`,
    ],
    scoring:
      '100 points per correct answer, up to 50 more for answering quickly, and +20 per answer while on a streak of 3 or more. Getting 60% or more counts as a win.',
    difficultyNotes: o.difficulty,
    tips: o.tips,
    touchNotes: ['Tap an answer. Answer buttons are large and stack in one column on phones.'],
  };
}

/** The standard achievements every quiz-engine game reports. */
export function quizAchievements(scoreTarget: number, icon?: string): AchievementSpec[] {
  return [
    ['first', 'First Answer', 'Get your first answer right.', 1, icon, 5],
    [
      'score',
      'High Scorer',
      `Score ${scoreTarget.toLocaleString()} points in one round.`,
      scoreTarget,
      icon,
      15,
    ],
    ['perfect', 'Perfect Round', 'Answer every question in a round correctly.', 1, '🏆', 20],
    ['streak', 'On a Roll', 'Get 7 answers right in a row.', 7, '🔥', 10],
  ];
}
