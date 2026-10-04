import { QuizGame } from '../_shared/quiz/QuizGame';
import { makeQuestions } from './questions';

export default function Game() {
  return (
    <QuizGame
      makeQuestions={makeQuestions}
      intro="Fifteen times-table questions against the clock."
      timeLimit={{ easy: 20, normal: 10, hard: 6 }}
    />
  );
}
