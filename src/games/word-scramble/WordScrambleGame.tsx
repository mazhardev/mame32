import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { useCountdown } from '../_shared/useCountdown';
import { AnswerInput, TileRow, WordLayout, WordToast } from '../_shared/words/WordUI';
import { LENGTHS, accepts, pickWords, scramble, wordScore } from './engine';

const ROUNDS = 10;
const SECONDS = { easy: 45, normal: 30, hard: 25 } as const;

interface Round {
  word: string;
  shuffled: string;
}

export default function WordScrambleGame() {
  const shell = useGameShell();
  const seconds = SECONDS[shell.difficulty];
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [hints, setHints] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const stats = useRef({ solved: 0, noHint: 0 });

  const endGame = useCallback(
    (finalScore: number, finalSolved: number) => {
      setPhase('done');
      void reportProgress('word-scramble.first', finalSolved);
      void reportProgress('word-scramble.score', finalScore);
      if (finalSolved === ROUNDS) void reportProgress('word-scramble.perfect', 1);
      shell.endRound({
        score: finalScore,
        won: finalSolved >= ROUNDS * 0.6,
        lost: finalSolved < ROUNDS * 0.6,
        details: [
          { label: 'Words solved', value: `${finalSolved} / ${ROUNDS}` },
          { label: 'Solved without hints', value: String(stats.current.noHint) },
        ],
      });
    },
    [shell],
  );

  const advance = useCallback(
    (nextScore: number, nextSolved: number) => {
      if (index + 1 >= ROUNDS) {
        endGame(nextScore, nextSolved);
        return;
      }
      setIndex((i) => i + 1);
      setHints(0);
      timer.reset(seconds);
    },
    // timer is stable; listed deps are what matter
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, endGame, seconds],
  );

  const timer = useCountdown(seconds, phase === 'playing' && !shell.paused, () => {
    const word = rounds[index]?.word ?? '';
    setMessage(`Time! It was ${word.toUpperCase()}.`);
    shell.play('failure');
    advance(score, solved);
  });

  const start = useCallback(() => {
    const rng = createRng(Date.now());
    const words = pickWords(rng, LENGTHS[shell.difficulty], ROUNDS);
    setRounds(words.map((w) => ({ word: w, shuffled: scramble(w, rng) })));
    setIndex(0);
    setScore(0);
    setSolved(0);
    setHints(0);
    setMessage(null);
    stats.current = { solved: 0, noHint: 0 };
    timer.reset(SECONDS[shell.difficulty]);
    setPhase('playing');
    shell.startRound();
  }, [shell, timer]);

  useEffect(() => shell.registerRestart(() => setPhase('ready')), [shell]);
  useEffect(() => setPhase('ready'), [shell.difficulty]);

  const round = rounds[index];

  const submit = (value: string) => {
    if (!round || phase !== 'playing' || shell.paused) return;
    if (accepts(value, round.word)) {
      const points = wordScore(round.word, timer.left, hints);
      const nextScore = score + points;
      const nextSolved = solved + 1;
      if (hints === 0) stats.current.noHint++;
      setScore(nextScore);
      setSolved(nextSolved);
      setMessage(
        value === round.word
          ? `Correct! +${points}`
          : `${value.toUpperCase()} works too! +${points} (we had ${round.word.toUpperCase()})`,
      );
      shell.play('success');
      advance(nextScore, nextSolved);
    } else {
      shell.play('failure');
      setMessage(
        value.length !== round.word.length
          ? `Use all ${round.word.length} letters`
          : 'Not quite — try again',
      );
    }
  };

  const skip = () => {
    if (!round) return;
    setMessage(`Skipped: it was ${round.word.toUpperCase()}.`);
    advance(score, solved);
  };

  if (phase === 'ready') {
    return (
      <WordLayout>
        <div className="word-panel">
          <p>
            Unscramble {ROUNDS} words. You have {seconds} seconds for each one.
          </p>
          <button className="btn btn-primary btn-lg" onClick={start}>
            Start
          </button>
        </div>
      </WordLayout>
    );
  }

  const hintText = round ? round.word.slice(0, hints).toUpperCase() : '';

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Word', value: `${Math.min(index + 1, ROUNDS)}/${ROUNDS}` },
          { label: 'Score', value: score },
          { label: 'Time', value: `${timer.seconds}s` },
        ]}
      />
      {round && phase === 'playing' && (
        <>
          <TileRow
            word={round.shuffled}
            length={round.shuffled.length}
            label={`Scrambled letters ${round.shuffled.toUpperCase()}`}
          />
          <p className="small muted">
            {hints > 0 ? `Starts with ${hintText}…` : `${round.word.length} letters`}
          </p>
          <AnswerInput
            onSubmit={submit}
            disabled={shell.paused}
            maxLength={round.word.length + 2}
          />
          <div className="row">
            <button
              className="btn"
              onClick={() => setHints((h) => Math.min(h + 1, round.word.length - 1))}
              disabled={shell.paused}
            >
              Hint (−30)
            </button>
            <button className="btn" onClick={skip} disabled={shell.paused}>
              Skip
            </button>
          </div>
        </>
      )}
      <WordToast message={message} />
    </WordLayout>
  );
}
