import { QuizGame } from '../_shared/quiz/QuizGame';
import { makeQuestions } from './questions';

export default function Game() {
  return (
    <QuizGame
      makeQuestions={makeQuestions}
      intro="Answer 12 questions correctly before the computer car finishes the race."
      race={{ target: 12, aiSeconds: { easy: 90, normal: 60, hard: 40 } }}
    />
  );
}
