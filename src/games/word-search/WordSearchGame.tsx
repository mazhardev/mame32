'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { LEVELS, generate, pathBetween, matchWord } from './engine';
export default function WordSearchGame() {
  const shell = useGameShell();
  const level = LEVELS[shell.difficulty];
  const [board, setBoard] = useState(() => generate(level));
  const size = board.size;
  const [first, setFirst] = useState<number | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [marked, setMarked] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState('Choose the first and last letter of a word.');
  const started = useRef(false);
  const reset = useCallback(() => {
    setBoard(generate(level));
    setFirst(null);
    setFound([]);
    setMarked([]);
    setAttempts(0);
    started.current = false;
  }, [level]);
  useEffect(() => {
    shell.registerRestart(reset);
  }, [shell, reset]);
  function select(i: number) {
    if (shell.paused || found.length === board.placed.length) return;
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
    if (first === null) {
      setFirst(i);
      return;
    }
    const path = pathBetween(first, i, size);
    setFirst(null);
    if (path.length < 2) return;
    setAttempts(attempts + 1);
    const match = board.placed.find(
      (p) => !found.includes(p.word) && matchWord(board.grid, path, p.word),
    );
    if (!match) {
      setMessage('No listed word on that straight line. Try again.');
      shell.play('failure');
      return;
    }
    const next = [...found, match.word];
    setFound(next);
    setMarked([...marked, ...path]);
    setMessage(`${match.word} found!`);
    shell.play('success');
    if (next.length === board.placed.length) {
      const score = Math.max(100, 1000 - (attempts + 1 - next.length) * 25);
      void reportProgress('word-search.win', 1);
      void reportProgress('word-search.score', score);
      shell.endRound({ title: 'All words found!', won: true, score });
    }
  }
  return (
    <div className="game-canvas-wrap" style={{ flexDirection: 'column', gap: 14, padding: 10 }}>
      <GameHud
        items={[
          { label: 'Found', value: `${found.length}/${board.placed.length}` },
          { label: 'Selections', value: attempts },
        ]}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size},minmax(0,1fr))`,
          gap: 2,
          width: `min(100%,${size > 10 ? 560 : 500}px)`,
        }}
      >
        {board.grid.map((letter, i) => (
          <button
            key={i}
            aria-label={`Row ${Math.floor(i / size) + 1} column ${(i % size) + 1}: ${letter}`}
            aria-pressed={first === i || marked.includes(i)}
            onClick={() => select(i)}
            disabled={shell.paused}
            style={{
              aspectRatio: '1',
              padding: 0,
              minWidth: 0,
              fontSize: size > 10 ? 'clamp(.6rem,2.4vw,1.05rem)' : 'clamp(.7rem,3vw,1.2rem)',
              fontWeight: 700,
              color: 'var(--text)',
              background:
                first === i
                  ? 'var(--brand)'
                  : marked.includes(i)
                    ? 'var(--brand-soft)'
                    : 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 4,
            }}
          >
            {letter}
          </button>
        ))}
      </div>
      <div className="row wrap" style={{ justifyContent: 'center', gap: 10 }}>
        {board.placed.map((p) => (
          <span
            className="badge"
            key={p.word}
            style={{ textDecoration: found.includes(p.word) ? 'line-through' : undefined }}
          >
            {p.word}
          </span>
        ))}
      </div>
      <p role="status" className="small muted">
        {message}
      </p>
    </div>
  );
}
