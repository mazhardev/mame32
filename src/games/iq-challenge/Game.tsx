import { QuizGame } from '../_shared/quiz/QuizGame';
import { makeQuestions } from './questions';

export default function Game() {
  return (
    <QuizGame
      makeQuestions={makeQuestions}
      intro="Fifteen reasoning puzzles. Just for fun — not a real IQ test."
      timeLimit={{ hard: 30 }}
    />
  );
}
