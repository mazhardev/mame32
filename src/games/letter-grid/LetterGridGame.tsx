import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { isWord } from '../_shared/words/lexicon';
import { useCountdown } from '../_shared/useCountdown';
import { AnswerInput, StartPanel, WordLayout, WordToast } from '../_shared/words/WordUI';
import { findPath, makeGrid, neighbours, notableMissed, solveGrid, wordPoints } from './engine';

const LEVELS = {
  easy: { size: 4, seconds: 240, min: 3 },
  normal: { size: 4, seconds: 180, min: 3 },
  hard: { size: 5, seconds: 180, min: 4 },
} as const;

export default function LetterGridGame() {
  const shell = useGameShell();
  const level = LEVELS[shell.difficulty];
  const [grid, setGrid] = useState<string[]>([]);
  const [path, setPath] = useState<number[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const dragging = useRef(false);

  const allWords = useMemo(
    () => (grid.length ? solveGrid(grid, level.size, level.min) : []),
    [grid, level],
  );

  const finish = useCallback(() => {
    setPhase('done');
    void reportProgress('letter-grid.words', found.length);
    void reportProgress('letter-grid.score', score);
    void reportProgress('letter-grid.long', Math.max(0, ...found.map((w) => w.length)));
    const missed = notableMissed(allWords, found);
    shell.endRound({
      score,
      won: found.length >= 10,
      lost: found.length < 10,
      title: 'Time’s up!',
      details: [
        { label: 'Words found', value: `${found.length} of ${allWords.length}` },
        {
          label: 'Longest',
          value: found.reduce((a, w) => (w.length > a.length ? w : a), '').toUpperCase() || '—',
        },
        {
          label: 'You missed',
          value:
            missed
              .slice(0, 6)
              .map((w) => w.toUpperCase())
              .join(', ') || '—',
        },
      ],
    });
  }, [allWords, found, score, shell]);

  const timer = useCountdown(level.seconds, phase === 'playing' && !shell.paused, finish);

  const start = () => {
    setGrid(makeGrid(createRng(Date.now()), level.size));
    setFound([]);
    setScore(0);
    setPath([]);
    setMessage(null);
    timer.reset(level.seconds);
    setPhase('playing');
    shell.startRound();
  };

  useEffect(() => shell.registerRestart(() => setPhase('ready')), [shell]);
  useEffect(() => setPhase('ready'), [shell.difficulty]);

  const accept = (word: string) => {
    if (word.length < level.min) return setMessage(`Words need ${level.min}+ letters`);
    if (found.includes(word)) return setMessage('Already found');
    if (!isWord(word)) {
      shell.play('failure');
      return setMessage(`${word.toUpperCase()} isn’t in the word list`);
    }
    const pts = wordPoints(word);
    setFound((f) => [word, ...f]);
    setScore((s) => s + pts);
    shell.play(word.length >= 6 ? 'levelComplete' : 'coin');
    setMessage(`${word.toUpperCase()} +${pts}`);
  };

  const typed = (value: string) => {
    if (phase !== 'playing' || shell.paused) return;
    if (!findPath(grid, level.size, value)) {
      shell.play('failure');
      return setMessage('That word isn’t in the grid');
    }
    accept(value);
  };

  const cellAt = (e: ReactPointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-cell]');
    return el ? Number(el.dataset.cell) : null;
  };

  const onDown = (e: ReactPointerEvent) => {
    if (phase !== 'playing' || shell.paused) return;
    const i = cellAt(e);
    if (i === null) return;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setPath([i]);
  };

  const onMove = (e: ReactPointerEvent) => {
    if (!dragging.current) return;
    const i = cellAt(e);
    if (i === null) return;
    setPath((p) => {
      if (p[p.length - 1] === i) return p;
      if (p.length > 1 && p[p.length - 2] === i) return p.slice(0, -1); // backtrack
      if (p.includes(i) || !neighbours(p[p.length - 1], level.size).includes(i)) return p;
      return [...p, i];
    });
  };

  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const word = path.map((i) => grid[i]).join('');
    setPath([]);
    if (word.length > 1) accept(word);
  };

  if (phase === 'ready') {
    return (
      <StartPanel onStart={start}>
        <p>
          Find words by joining neighbouring letters — up, down, sideways or diagonally — without
          using a tile twice. Drag across the tiles or type words. {Math.round(level.seconds / 60)}{' '}
          minutes on the clock.
        </p>
      </StartPanel>
    );
  }

  const current = path.map((i) => grid[i]).join('');
  const cell = `min(${level.size === 5 ? 15 : 19}vw, ${level.size === 5 ? 64 : 76}px)`;

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Score', value: score },
          { label: 'Words', value: `${found.length}/${allWords.length}` },
          { label: 'Time', value: `${timer.seconds}s` },
        ]}
      />
      <div
        style={{
          minHeight: '1.6em',
          fontWeight: 800,
          fontSize: '1.3rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {current}
      </div>
      <div
        role="grid"
        aria-label="Letter grid"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${level.size}, ${cell})`,
          gap: 8,
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {grid.map((ch, i) => (
          <div
            key={i}
            data-cell={i}
            role="gridcell"
            className={`word-tile ${path.includes(i) ? 'present' : ''}`}
            style={{ width: cell, height: cell, fontSize: `calc(${cell} * 0.45)` }}
          >
            {ch}
          </div>
        ))}
      </div>
      {phase === 'playing' && (
        <AnswerInput
          onSubmit={typed}
          disabled={shell.paused}
          autoFocus={false}
          placeholder="Or type a word"
        />
      )}
      <WordToast message={message} />
      <div className="word-chips">
        {found.map((w) => (
          <span key={w} className="word-chip found">
            {w}
          </span>
        ))}
      </div>
    </WordLayout>
  );
}
