import { QuizGame } from '../_shared/quiz/QuizGame';
import { makeQuestions } from './questions';

export default function Game() {
  return (
    <QuizGame
      makeQuestions={makeQuestions}
      intro="A fifteen-question workout that mixes different drills."
      timeLimit={{ easy: 20, normal: 12, hard: 8 }}
    />
  );
}
