import { QuizGame } from '../_shared/quiz/QuizGame';
import { makeQuestions } from './questions';

export default function Game() {
  return (
    <QuizGame
      makeQuestions={makeQuestions}
      intro="Find the next number in ten sequences."
      timeLimit={{ easy: 40, normal: 30, hard: 20 }}
    />
  );
}
