import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { isWord } from '../_shared/words/lexicon';
import { useCountdown } from '../_shared/useCountdown';
import { AnswerInput, StartPanel, TileRow, WordLayout, WordToast } from '../_shared/words/WordUI';
import { matchesPattern, pickPuzzles, solutions } from './engine';
import type { Puzzle } from './engine';

const ROUNDS = 12;
const SECONDS = { easy: 30, normal: 30, hard: 35 } as const;

export default function MissingLettersGame() {
  const shell = useGameShell();
  const seconds = SECONDS[shell.difficulty];
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');

  const finish = useCallback(
    (finalScore: number, finalSolved: number) => {
      setPhase('done');
      void reportProgress('missing-letters.first', finalSolved);
      void reportProgress('missing-letters.score', finalScore);
      if (finalSolved === ROUNDS) void reportProgress('missing-letters.perfect', 1);
      shell.endRound({
        score: finalScore,
        won: finalSolved >= ROUNDS * 0.6,
        lost: finalSolved < ROUNDS * 0.6,
        details: [{ label: 'Words completed', value: `${finalSolved} / ${ROUNDS}` }],
      });
    },
    [shell],
  );

  const timer = useCountdown(seconds, phase === 'playing' && !shell.paused, () => {
    const p = puzzles[index];
    if (p) setMessage(`Time! One answer: ${p.word.toUpperCase()}`);
    shell.play('failure');
    next(score, solved);
  });

  function next(s: number, n: number) {
    if (index + 1 >= ROUNDS) return finish(s, n);
    setIndex((i) => i + 1);
    timer.reset(seconds);
  }

  const start = () => {
    setPuzzles(pickPuzzles(createRng(Date.now()), shell.difficulty, ROUNDS));
    setIndex(0);
    setScore(0);
    setSolved(0);
    setMessage(null);
    timer.reset(seconds);
    setPhase('playing');
    shell.startRound();
  };

  useEffect(() => shell.registerRestart(() => setPhase('ready')), [shell]);
  useEffect(() => setPhase('ready'), [shell.difficulty]);

  const puzzle = puzzles[index];

  const submit = (value: string) => {
    if (!puzzle || phase !== 'playing' || shell.paused) return;
    if (!matchesPattern(value, puzzle.pattern)) {
      shell.play('failure');
      return setMessage('That doesn’t fit the letters shown');
    }
    if (!isWord(value)) {
      shell.play('failure');
      return setMessage('Not in the word list');
    }
    const blanks = [...puzzle.pattern].filter((c) => c === '_').length;
    const points = 40 * blanks + puzzle.word.length * 5 + Math.round(timer.left) * 2;
    const others = solutions(puzzle.pattern).filter((w) => w !== value);
    setScore((s) => s + points);
    setSolved((n) => n + 1);
    shell.play('success');
    setMessage(
      `+${points}${
        others.length
          ? ` · also fits: ${others
              .slice(0, 3)
              .map((o) => o.toUpperCase())
              .join(', ')}`
          : ''
      }`,
    );
    next(score + points, solved + 1);
  };

  if (phase === 'ready') {
    return (
      <StartPanel onStart={start}>
        <p>
          Fill in the missing letters to complete each word. Any real word that fits counts.{' '}
          {ROUNDS} words, {seconds} seconds each.
        </p>
      </StartPanel>
    );
  }

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Word', value: `${Math.min(index + 1, ROUNDS)}/${ROUNDS}` },
          { label: 'Score', value: score },
          { label: 'Time', value: `${timer.seconds}s` },
        ]}
      />
      {puzzle && phase === 'playing' && (
        <>
          <TileRow
            word={puzzle.pattern.replace(/_/g, ' ')}
            length={puzzle.pattern.length}
            states={[...puzzle.pattern].map((c) => (c === '_' ? 'empty' : 'correct'))}
            label={`Word with gaps: ${puzzle.pattern.replace(/_/g, ' blank ')}`}
          />
          <AnswerInput
            onSubmit={submit}
            disabled={shell.paused}
            maxLength={puzzle.pattern.length}
            placeholder="Type the whole word"
          />
          <button
            className="btn"
            disabled={shell.paused}
            onClick={() => {
              setMessage(`Skipped: ${puzzle.word.toUpperCase()}`);
              next(score, solved);
            }}
          >
            Skip
          </button>
        </>
      )}
      <WordToast message={message} />
    </WordLayout>
  );
}
