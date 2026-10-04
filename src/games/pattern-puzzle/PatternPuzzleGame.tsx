'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { formatClock } from '@/utils/format';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions } from '../_shared/puzzle/PuzzleUI';
import { useStopwatch } from '../_shared/puzzle/useStopwatch';
import { correctCount, generate, matches, scoreFor, shift } from './engine';
import type { Grid, Move } from './engine';
import './pattern.css';

const TILE = [
  { color: '#ef4444', mark: '●' },
  { color: '#3b82f6', mark: '■' },
  { color: '#facc15', mark: '▲' },
  { color: '#22c55e', mark: '◆' },
  { color: '#a855f7', mark: '★' },
];
const newSeed = () => Math.random().toString(36).slice(2, 10);

export default function PatternPuzzleGame() {
  const shell = useGameShell();
  const [puzzle, setPuzzle] = useState(() => generate(shell.difficulty, newSeed()));
  const { n, target } = puzzle;
  const [grid, setGrid] = useState<Grid>(puzzle.grid);
  const [history, setHistory] = useState<Grid[]>([]);
  const [moves, setMoves] = useState(0);
  const [drag, setDrag] = useState<{ axis: 'row' | 'col'; index: number; by: number } | null>(null);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const { elapsed, read, reset } = useStopwatch(started && !done && !shell.paused);
  const boardRef = useRef<HTMLDivElement>(null);
  const press = useRef<{ cell: number; x: number; y: number } | null>(null);
  const locked = shell.paused || done;

  const restart = useCallback(() => {
    const p = generate(shell.difficulty, newSeed());
    setPuzzle(p);
    setGrid(p.grid);
    setHistory([]);
    setMoves(0);
    setDrag(null);
    setStarted(false);
    setDone(false);
    reset(0);
  }, [reset, shell.difficulty]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const apply = (move: Move) => {
    if (locked || move.by === 0) return;
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    const next = shift(grid, n, move);
    const count = moves + Math.abs(move.by);
    setHistory([...history, grid]);
    setGrid(next);
    setMoves(count);
    shell.play('click');
    if (matches(next, target)) {
      setDone(true);
      const ms = read();
      shell.play('levelComplete');
      void reportProgress('pattern-puzzle.first', 1);
      void incrementProgress('pattern-puzzle.ten');
      if (n === 5) void reportProgress('pattern-puzzle.five', 1);
      if (n >= 4 && count <= n * 6) void reportProgress('pattern-puzzle.efficient', 1);
      shell.endRound({
        won: true,
        score: scoreFor(n, count, ms),
        timeMs: ms,
        title: 'Pattern matched!',
        details: [
          { label: 'Grid', value: `${n}×${n}` },
          { label: 'Slides', value: String(count) },
        ],
      });
    }
  };

  const undo = () => {
    if (locked || !history.length) return;
    setGrid(history[history.length - 1]);
    setHistory(history.slice(0, -1));
  };

  // Drag a row or column: the axis is decided by the first clear movement.
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (locked) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-cell]');
    if (!el) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    press.current = { cell: Number(el.dataset.cell), x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    const board = boardRef.current;
    if (!p || !board) return;
    const size = board.getBoundingClientRect().width / n;
    const dx = (e.clientX - p.x) / size;
    const dy = (e.clientY - p.y) / size;
    if (!drag && Math.max(Math.abs(dx), Math.abs(dy)) < 0.3) return;
    const axis = drag?.axis ?? (Math.abs(dx) > Math.abs(dy) ? 'row' : 'col');
    const index = axis === 'row' ? Math.floor(p.cell / n) : p.cell % n;
    setDrag({ axis, index, by: Math.round(axis === 'row' ? dx : dy) });
  };
  const onPointerUp = () => {
    press.current = null;
    if (drag) apply(drag);
    setDrag(null);
  };

  const shown = drag && drag.by ? shift(grid, n, drag) : grid;
  const right = correctCount(grid, target);

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Slides', value: moves },
          { label: 'Matching', value: `${right}/${n * n}` },
          { label: 'Time', value: formatClock(elapsed) },
        ]}
      />
      <StatusBar>
        {done ? 'Perfect match!' : 'Slide rows and columns (they wrap round) until the grid matches the target.'}
      </StatusBar>
      <div className="pp-wrap">
        <div className="pp-target" aria-label="Target pattern" role="img">
          <div className="small muted">Target</div>
          <div className="pp-mini" style={{ ['--n' as string]: n }}>
            {target.map((v, i) => (
              <span key={i} style={{ background: TILE[v].color }} />
            ))}
          </div>
        </div>
        <div className="pp-frame" style={{ ['--n' as string]: n }}>
          {Array.from({ length: n }, (_, c) => (
            <button key={`u${c}`} type="button" className="pp-arrow" style={{ gridRow: 1, gridColumn: c + 2 }} onClick={() => apply({ axis: 'col', index: c, by: -1 })} disabled={locked} aria-label={`Slide column ${c + 1} up`}>
              ▲
            </button>
          ))}
          {Array.from({ length: n }, (_, c) => (
            <button key={`d${c}`} type="button" className="pp-arrow" style={{ gridRow: n + 2, gridColumn: c + 2 }} onClick={() => apply({ axis: 'col', index: c, by: 1 })} disabled={locked} aria-label={`Slide column ${c + 1} down`}>
              ▼
            </button>
          ))}
          {Array.from({ length: n }, (_, r) => (
            <button key={`l${r}`} type="button" className="pp-arrow" style={{ gridRow: r + 2, gridColumn: 1 }} onClick={() => apply({ axis: 'row', index: r, by: -1 })} disabled={locked} aria-label={`Slide row ${r + 1} left`}>
              ◀
            </button>
          ))}
          {Array.from({ length: n }, (_, r) => (
            <button key={`r${r}`} type="button" className="pp-arrow" style={{ gridRow: r + 2, gridColumn: n + 2 }} onClick={() => apply({ axis: 'row', index: r, by: 1 })} disabled={locked} aria-label={`Slide row ${r + 1} right`}>
              ▶
            </button>
          ))}
          <div
            ref={boardRef}
            className={`pp-grid${done ? ' pz-win' : ''}`}
            style={{ gridRow: `2 / span ${n}`, gridColumn: `2 / span ${n}` }}
            role="grid"
            aria-label={`Your grid: ${right} of ${n * n} tiles match the target`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {shown.map((v, i) => (
              <div
                key={i}
                data-cell={i}
                className={`pp-tile${v === target[i] ? ' ok' : ''}`}
                style={{ background: TILE[v].color }}
                role="gridcell"
                aria-label={`${TILE[v].mark}${v === target[i] ? ', matches' : ''}`}
              >
                <span aria-hidden="true">{TILE[v].mark}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <PuzzleActions>
        <button type="button" className="btn btn-sm" onClick={undo} disabled={locked || !history.length}>
          ↶ Undo
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
