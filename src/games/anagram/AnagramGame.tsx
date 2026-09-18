import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { useCountdown } from '../_shared/useCountdown';
import { AnswerInput, StartPanel, TileRow, WordLayout, WordToast } from '../_shared/words/WordUI';
import { isAnagramOf, pickPuzzles } from './engine';
import type { Puzzle } from './engine';

const ROUNDS = 10;
const SECONDS = { easy: 40, normal: 35, hard: 45 } as const;

export default function AnagramGame() {
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
      void reportProgress('anagram.first', finalSolved);
      void reportProgress('anagram.score', finalScore);
      if (finalSolved === ROUNDS) void reportProgress('anagram.perfect', 1);
      shell.endRound({
        score: finalScore,
        won: finalSolved >= 6,
        lost: finalSolved < 6,
        details: [{ label: 'Anagrams found', value: `${finalSolved} / ${ROUNDS}` }],
      });
    },
    [shell],
  );

  const timer = useCountdown(seconds, phase === 'playing' && !shell.paused, () => {
    const p = puzzles[index];
    if (p) setMessage(`Time! Answers: ${p.answers.map((a) => a.toUpperCase()).join(', ')}`);
    shell.play('failure');
    next(score, solved);
  });

  function next(nextScore: number, nextSolved: number) {
    if (index + 1 >= ROUNDS) return finish(nextScore, nextSolved);
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
    if (value === puzzle.shown) return setMessage('That’s the same word — rearrange it!');
    if (!isAnagramOf(value, puzzle.shown)) {
      shell.play('failure');
      return setMessage('Not an anagram of that word');
    }
    const points = 50 + puzzle.shown.length * 10 + Math.round(timer.left) * 3;
    setScore((s) => s + points);
    setSolved((s) => s + 1);
    shell.play('success');
    const others = puzzle.answers.filter((a) => a !== value);
    setMessage(
      `Yes! +${points}${others.length ? ` (also: ${others.map((o) => o.toUpperCase()).join(', ')})` : ''}`,
    );
    next(score + points, solved + 1);
  };

  if (phase === 'ready') {
    return (
      <StartPanel onStart={start}>
        <p>
          Each round shows a word. Rearrange ALL its letters to make a different word — for example
          LISTEN → SILENT. {ROUNDS} rounds, {seconds} seconds each.
        </p>
      </StartPanel>
    );
  }

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Round', value: `${Math.min(index + 1, ROUNDS)}/${ROUNDS}` },
          { label: 'Score', value: score },
          { label: 'Time', value: `${timer.seconds}s` },
        ]}
      />
      {puzzle && phase === 'playing' && (
        <>
          <TileRow
            word={puzzle.shown}
            length={puzzle.shown.length}
            states={[...puzzle.shown].map(() => 'correct')}
          />
          <p className="small muted">Find another word using exactly these letters.</p>
          <AnswerInput onSubmit={submit} disabled={shell.paused} maxLength={puzzle.shown.length} />
          <button
            className="btn"
            disabled={shell.paused}
            onClick={() => {
              setMessage(`Skipped: ${puzzle.answers.map((a) => a.toUpperCase()).join(', ')}`);
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
