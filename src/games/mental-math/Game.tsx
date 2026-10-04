import { QuizGame } from '../_shared/quiz/QuizGame';
import { makeQuestions } from './questions';

export default function Game() {
  return (
    <QuizGame
      makeQuestions={makeQuestions}
      intro="Ten mental arithmetic questions. No calculators!"
      timeLimit={{ easy: 30, normal: 20, hard: 12 }}
    />
  );
}
