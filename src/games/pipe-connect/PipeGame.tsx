import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { formatClock } from '@/utils/format';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions, ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { useStopwatch } from '../_shared/puzzle/useStopwatch';
import { E, N, S, SIZES, W, current, flooded, generate, isSolved, minClicks, scoreFor, scramble } from './engine';
import type { Puzzle } from './engine';
import './pipes.css';

const ID = 'pipe-connect';

interface PipeSave {
  puzzle: Puzzle;
  turns: number[];
  locked: boolean[];
  clicks: number;
  par: number;
  ms: number;
}

function validSave(v: unknown): v is PipeSave {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  const p = s.puzzle as Record<string, unknown> | undefined;
  if (!p || (p.n !== 5 && p.n !== 7 && p.n !== 9)) return false;
  const size = (p.n as number) ** 2;
  const ints = (a: unknown, min: number, max: number) =>
    Array.isArray(a) && a.length === size && a.every((x) => Number.isInteger(x) && x >= min && x <= max);
  if (!ints(p.solution, 1, 14) || !Number.isInteger(p.source)) return false;
  if (!ints(s.turns, -1000, 1000)) return false;
  if (!Array.isArray(s.locked) || s.locked.length !== size) return false;
  return Number.isInteger(s.clicks) && Number.isInteger(s.par) && typeof s.ms === 'number';
}

function fresh(n: number) {
  const puzzle = generate(n, Math.random);
  const turns = scramble(puzzle, Math.random);
  return { puzzle, turns, par: minClicks(puzzle, turns) };
}

const ARMS: [number, number, number][] = [
  [N, 0, -0.5],
  [E, 0.5, 0],
  [S, 0, 0.5],
  [W, -0.5, 0],
];

export default function PipeGame() {
  const shell = useGameShell();
  const n = SIZES[shell.difficulty];
  const save = useSavedGame(ID, validSave);
  const [state, setState] = useState(() => fresh(n));
  const [turns, setTurns] = useState<number[]>(state.turns);
  const [locks, setLocks] = useState<boolean[]>(() => state.puzzle.solution.map(() => false));
  const [clicks, setClicks] = useState(0);
  const [cursor, setCursor] = useState(state.puzzle.source);
  const [lockMode, setLockMode] = useState(false);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const { elapsed, read, reset } = useStopwatch(started && !done && !shell.paused);
  const { puzzle, par } = state;
  const pending = save.saved && save.saved.puzzle.n === n ? save.saved : null;
  const locked = shell.paused || done || !!pending || save.loading;

  const restart = useCallback(() => {
    const s = fresh(n);
    setState(s);
    setTurns(s.turns);
    setLocks(s.puzzle.solution.map(() => false));
    setClicks(0);
    setCursor(s.puzzle.source);
    setStarted(false);
    setDone(false);
    reset(0);
    save.clear();
  }, [n, reset, save]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const masks = useMemo(() => current(puzzle, turns), [puzzle, turns]);
  const wet = useMemo(() => flooded(n, puzzle.source, masks), [masks, n, puzzle.source]);

  const turn = useCallback(
    (cell: number, dir: 1 | -1) => {
      if (locked || locks[cell]) return;
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      const next = turns.slice();
      next[cell] += dir;
      const count = clicks + 1;
      setTurns(next);
      setClicks(count);
      setCursor(cell);
      if (isSolved(puzzle, next)) {
        setDone(true);
        const ms = read();
        save.clear();
        shell.play('levelComplete');
        void reportProgress('pipe-connect.first', 1);
        void incrementProgress('pipe-connect.ten');
        if (count <= par) void reportProgress('pipe-connect.perfect', 1);
        if (n === 9) void reportProgress('pipe-connect.nine', 1);
        shell.endRound({
          won: true,
          score: scoreFor(n, count, par, ms),
          timeMs: ms,
          title: 'Water everywhere!',
          details: [
            { label: 'Grid', value: `${n}×${n}` },
            { label: 'Turns', value: `${count} (fewest ${par})` },
          ],
        });
        return;
      }
      shell.play('click');
      const wetCount = flooded(n, puzzle.source, current(puzzle, next)).size;
      save.persist(
        { puzzle, turns: next, locked: locks, clicks: count, par, ms: read() },
        { percent: Math.round((wetCount / (n * n)) * 100), label: `${n}×${n} · ${wetCount}/${n * n} tiles watered` },
      );
    },
    [clicks, locked, locks, n, par, puzzle, read, save, shell, started, turns],
  );

  const toggleLock = (cell: number) => {
    if (locked) return;
    const next = locks.slice();
    next[cell] = !next[cell];
    setLocks(next);
    shell.play('select');
  };

  const onTile = (cell: number, e: ReactPointerEvent) => {
    if (lockMode) toggleLock(cell);
    else turn(cell, e.button === 2 || e.shiftKey ? -1 : 1);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (locked) return;
    const moves: Record<string, number> = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in moves) {
      e.preventDefault();
      const d = moves[e.key];
      if ((d === -1 && cursor % n === 0) || (d === 1 && cursor % n === n - 1)) return;
      const t = cursor + d;
      if (t >= 0 && t < n * n) setCursor(t);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      turn(cursor, e.shiftKey ? -1 : 1);
    } else if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      toggleLock(cursor);
    }
  };

  const resume = () => {
    if (!pending) return;
    setState({ puzzle: pending.puzzle, turns: pending.turns, par: pending.par });
    setTurns(pending.turns);
    setLocks(pending.locked.map(Boolean));
    setClicks(pending.clicks);
    reset(pending.ms);
    save.dismiss();
  };

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Watered', value: `${wet.size}/${n * n}` },
          { label: 'Turns', value: clicks },
          { label: 'Fewest', value: par },
          { label: 'Time', value: formatClock(elapsed) },
        ]}
      />
      {pending && (
        <ResumePrompt label={`${pending.puzzle.n}×${pending.puzzle.n} · ${pending.clicks} turns`} onContinue={resume} onNew={restart} />
      )}
      <StatusBar>
        {done
          ? 'Every tile has water and no pipe leaks!'
          : lockMode
            ? 'Lock tool: tap tiles you are sure of so they cannot be turned by accident.'
            : 'Turn the tiles so water from the centre reaches every tile, with no open pipe ends.'}
      </StatusBar>
      <div
        className={`pipes-board${done ? ' pz-win' : ''}`}
        role="application"
        tabIndex={0}
        aria-label={`Pipe puzzle ${n} by ${n}. ${wet.size} of ${n * n} tiles have water. Arrow keys move, Enter turns clockwise, Shift+Enter anticlockwise, L locks a tile.`}
        onKeyDown={onKeyDown}
        onContextMenu={(e) => e.preventDefault()}
      >
        <svg viewBox={`0 0 ${n} ${n}`} className="pipes-svg">
          {puzzle.solution.map((base, c) => {
            const x = c % n;
            const y = Math.floor(c / n);
            const water = wet.has(c);
            const degree = [N, E, S, W].filter((b) => base & b).length;
            return (
              <g
                key={c}
                transform={`translate(${x + 0.5} ${y + 0.5})`}
                className={`pipe-tile${water ? ' wet' : ''}${locks[c] ? ' locked' : ''}`}
                onPointerDown={(e) => {
                  if (e.button === 0 || e.button === 2) onTile(c, e);
                }}
                role="img"
                aria-label={`Tile row ${y + 1} column ${x + 1}${water ? ', has water' : ''}${locks[c] ? ', locked' : ''}`}
              >
                <rect x={-0.5} y={-0.5} width={1} height={1} className="pipe-bg" />
                <g style={{ transform: `rotate(${turns[c] * 90}deg)` }} className="pipe-rot">
                  {ARMS.filter(([bit]) => base & bit).map(([bit, dx, dy]) => (
                    <line key={bit} x1={0} y1={0} x2={dx} y2={dy} className="pipe-arm" />
                  ))}
                  {c === puzzle.source ? (
                    <circle r={0.26} className="pipe-source" />
                  ) : degree === 1 ? (
                    <rect x={-0.17} y={-0.17} width={0.34} height={0.34} rx={0.07} className="pipe-end" />
                  ) : (
                    <circle r={0.11} className="pipe-joint" />
                  )}
                </g>
                {locks[c] && <rect x={-0.46} y={-0.46} width={0.92} height={0.92} className="pipe-lock" />}
              </g>
            );
          })}
          <rect
            x={(cursor % n) + 0.03}
            y={Math.floor(cursor / n) + 0.03}
            width={0.94}
            height={0.94}
            className="pipes-cursor"
          />
        </svg>
      </div>
      <PuzzleActions>
        <button
          type="button"
          className={`btn btn-sm${lockMode ? ' btn-primary' : ''}`}
          onClick={() => setLockMode(!lockMode)}
          aria-pressed={lockMode}
          disabled={locked}
        >
          🔒 Lock tool
        </button>
        <button type="button" className="btn btn-sm" onClick={restart} disabled={shell.paused}>
          🔀 New puzzle
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
