import { QuizGame } from '../_shared/quiz/QuizGame';
import { makeQuestions } from './questions';

export default function Game() {
  return (
    <QuizGame
      makeQuestions={makeQuestions}
      intro="Ten visual pattern puzzles."
      timeLimit={{ easy: 30, normal: 20, hard: 12 }}
    />
  );
}
