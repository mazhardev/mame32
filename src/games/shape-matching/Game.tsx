import { QuizGame } from '../_shared/quiz/QuizGame';
import { makeQuestions } from './questions';

export default function Game() {
  return (
    <QuizGame makeQuestions={makeQuestions} intro="Circles, squares and more — name that shape!" />
  );
}
