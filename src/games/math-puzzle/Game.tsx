import { QuizGame } from '../_shared/quiz/QuizGame';
import { makeQuestions } from './questions';

export default function Game() {
  return (
    <QuizGame
      makeQuestions={makeQuestions}
      intro="Fill the gap in ten equations."
      timeLimit={{ easy: 40, normal: 25, hard: 15 }}
    />
  );
}
