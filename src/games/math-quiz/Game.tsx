import { QuizGame } from '../_shared/quiz/QuizGame';
import { makeQuestions } from './questions';

export default function Game() {
  return (
    <QuizGame
      makeQuestions={makeQuestions}
      intro="Ten timed arithmetic questions. Pick a difficulty and press Start."
      timeLimit={{ easy: 25, normal: 15, hard: 12 }}
    />
  );
}
