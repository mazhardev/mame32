import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { formatClock } from '@/utils/format';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions } from '../_shared/puzzle/PuzzleUI';
import { useStopwatch } from '../_shared/puzzle/useStopwatch';
import { useCellDrag } from '../_shared/puzzle/useCellDrag';
import { useDirectionKeys } from '../_shared/puzzle/useDirectionKeys';
import { LEVELS, extend, generate, isComplete, nextDot, scoreFor } from './engine';
import type { Puzzle } from './engine';
import './dots.css';

export default function ConnectDotsGame() {
  const shell = useGameShell();
  const level = LEVELS[shell.difficulty];
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generate(level, Math.random));
  const [path, setPath] = useState<number[]>([]);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const pathRef = useRef(path);
  const { elapsed, read, reset } = useStopwatch(started && !done && !shell.paused);
  const { n } = puzzle;
  const locked = shell.paused || done;

  const restart = useCallback(() => {
    setPuzzle(generate(level, Math.random));
    setPath([]);
    pathRef.current = [];
    setStarted(false);
    setDone(false);
    setNote(null);
    reset(0);
  }, [level, reset]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const update = useCallback(
    (next: number[]) => {
      const prev = pathRef.current;
      if (next === prev) return;
      pathRef.current = next;
      setPath(next);
      setNote(null);
      if (!started && next.length) {
        setStarted(true);
        shell.startRound();
      }
      if (next.length > prev.length && puzzle.dots[next[next.length - 1]]) shell.play('pop');
      if (isComplete(puzzle, next)) {
        setDone(true);
        const ms = read();
        shell.play('levelComplete');
        void reportProgress('connect-the-dots.first', 1);
        void incrementProgress('connect-the-dots.ten');
        if (n === 7) void reportProgress('connect-the-dots.seven', 1);
        if (n === 6 && ms < 60_000) void reportProgress('connect-the-dots.quick', 1);
        shell.endRound({
          won: true,
          score: scoreFor(n, ms),
          timeMs: ms,
          title: 'Every square connected!',
          details: [{ label: 'Grid', value: `${n}×${n}` }],
        });
      }
    },
    [n, puzzle, read, shell, started],
  );

  const tryCell = useCallback(
    (cell: number) => {
      const next = extend(puzzle, pathRef.current, cell);
      if (next) update(next);
      else if (!pathRef.current.length) setNote('Start your line on dot 1.');
      else if (puzzle.dots[cell]) setNote(`Dot ${nextDot(puzzle, pathRef.current)} comes next.`);
    },
    [puzzle, update],
  );

  const drag = useCellDrag(
    n,
    n,
    {
      // Pressing on the line cuts it back there, so drawing continues from that square.
      onStart: tryCell,
      onEnter: tryCell,
    },
    !locked,
  );

  useDirectionKeys(
    (dir) => {
      const cur = pathRef.current;
      if (!cur.length) {
        update([puzzle.dots.indexOf(1)]);
        return;
      }
      const end = cur[cur.length - 1];
      const target =
        dir === 'up' ? end - n : dir === 'down' ? end + n : dir === 'left' ? (end % n ? end - 1 : -1) : end % n < n - 1 ? end + 1 : -1;
      if (target >= 0 && target < n * n) tryCell(target);
    },
    !locked,
    { Backspace: () => update(pathRef.current.slice(0, -1)) },
  );

  const centre = (c: number) => `${(c % n) + 0.5},${Math.floor(c / n) + 0.5}`;
  const wallLines = puzzle.walls.map((key) => {
    const [a, b] = key.split('-').map(Number);
    const vertical = b === a + 1; // wall between left/right neighbours
    const x = vertical ? (b % n) : (a % n);
    const y = vertical ? Math.floor(a / n) : Math.floor(b / n);
    return vertical ? (
      <line key={key} x1={x} y1={y} x2={x} y2={y + 1} className="dots-wall" />
    ) : (
      <line key={key} x1={x} y1={y} x2={x + 1} y2={y} className="dots-wall" />
    );
  });

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Time', value: formatClock(elapsed) },
          { label: 'Covered', value: `${path.length}/${n * n}` },
          { label: 'Next dot', value: done ? '✓' : Math.min(nextDot(puzzle, path), puzzle.total) },
        ]}
      />
      <StatusBar>
        {done
          ? 'Solved!'
          : (note ??
            (path.length
              ? 'Fill every square and finish on the last dot.'
              : 'Draw from dot 1 through every square, visiting the dots in order.'))}
      </StatusBar>
      <div
        className={`dots-board${done ? ' pz-win' : ''}`}
        style={{ ['--n' as string]: n }}
        role="application"
        aria-label={`Connect the dots, ${n} by ${n}. ${path.length} of ${n * n} squares covered. Arrow keys extend the line, Backspace takes a step back.`}
        tabIndex={0}
        {...drag}
      >
        {puzzle.dots.map((_, i) => (
          <div key={i} className={`dots-cell${path.includes(i) ? ' on' : ''}`} aria-hidden="true" />
        ))}
        <svg className="dots-svg" viewBox={`0 0 ${n} ${n}`} aria-hidden="true">
          {path.length > 1 && <polyline points={path.map(centre).join(' ')} className="dots-line" />}
          {wallLines}
          {puzzle.dots.map((d, i) =>
            d ? (
              <g key={i} transform={`translate(${(i % n) + 0.5} ${Math.floor(i / n) + 0.5})`}>
                <circle r={0.3} className={`dots-dot${path.includes(i) ? ' hit' : ''}`} />
                <text className="dots-num" textAnchor="middle" dominantBaseline="central" fontSize={0.32}>
                  {d}
                </text>
              </g>
            ) : null,
          )}
          {path.length > 0 && (
            <circle
              cx={(path[path.length - 1] % n) + 0.5}
              cy={Math.floor(path[path.length - 1] / n) + 0.5}
              r={0.14}
              className="dots-head"
            />
          )}
        </svg>
      </div>
      <PuzzleActions>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => update(pathRef.current.slice(0, -1))}
          disabled={locked || !path.length}
        >
          ↶ Step back
        </button>
        <button type="button" className="btn btn-sm" onClick={() => update([])} disabled={locked || !path.length}>
          Clear line
        </button>
        <button type="button" className="btn btn-sm" onClick={restart} disabled={shell.paused}>
          🔀 New puzzle
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
