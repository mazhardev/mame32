import { QuizGame } from '../_shared/quiz/QuizGame';
import { makeQuestions } from './questions';

export default function Game() {
  return (
    <QuizGame
      makeQuestions={makeQuestions}
      intro="Ten logic puzzles. Read carefully — some are tricky."
      layout="list"
    />
  );
}
