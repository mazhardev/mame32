import { QuizGame } from '../_shared/quiz/QuizGame';
import { makeQuestions } from './questions';

export default function Game() {
  return (
    <QuizGame
      makeQuestions={makeQuestions}
      intro="Synonyms and antonyms against the clock."
      timeLimit={{ easy: 20, normal: 14, hard: 9 }}
    />
  );
}
