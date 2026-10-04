'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { formatClock } from '@/utils/format';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions, ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { useStopwatch } from '../_shared/puzzle/useStopwatch';
import { useCellDrag } from '../_shared/puzzle/useCellDrag';
import {
  LEVELS,
  advance,
  begin,
  connectedCount,
  filledCount,
  generate,
  isConnected,
  isSolved,
  scoreFor,
  validSave,
} from './engine';
import type { Puzzle } from './engine';
import './flow.css';

const ID = 'flow-connect';
const COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#06b6d4',
  '#d946ef', '#a16207', '#94a3b8', '#8b5cf6', '#ec4899', '#14b8a6',
];
const LETTERS = 'ABCDEFGHIJKL';

export default function FlowGame() {
  const shell = useGameShell();
  const level = LEVELS[shell.difficulty];
  const save = useSavedGame(ID, validSave);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generate(level, Math.random));
  const [paths, setPaths] = useState<number[][]>(() => puzzle.ends.map(() => []));
  const [active, setActive] = useState(-1);
  const [cursor, setCursor] = useState(0);
  const [moves, setMoves] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const pathsRef = useRef(paths);
  const activeRef = useRef(-1);
  const lastFlow = useRef(-1);
  const { elapsed, read, reset } = useStopwatch(started && !done && !shell.paused);
  const { n } = puzzle;
  const pending = save.saved && save.saved.puzzle.n === level.n ? save.saved : null;
  const locked = shell.paused || done || !!pending || save.loading;

  const restart = useCallback(() => {
    const p = generate(level, Math.random);
    setPuzzle(p);
    const empty = p.ends.map(() => []);
    setPaths(empty);
    pathsRef.current = empty;
    setActive(-1);
    activeRef.current = -1;
    lastFlow.current = -1;
    setMoves(0);
    setStarted(false);
    setDone(false);
    reset(0);
    save.clear();
  }, [level, reset, save]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const commit = useCallback(
    (next: number[][], countMove: boolean) => {
      const prevConnected = connectedCount(puzzle, pathsRef.current);
      pathsRef.current = next;
      setPaths(next);
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      const moveCount = moves + (countMove ? 1 : 0);
      if (countMove) setMoves(moveCount);
      const connected = connectedCount(puzzle, next);
      if (connected > prevConnected) shell.play('success');
      if (isSolved(puzzle, next)) {
        setDone(true);
        setActive(-1);
        activeRef.current = -1;
        const ms = read();
        save.clear();
        shell.play('levelComplete');
        const perfect = moveCount <= puzzle.ends.length;
        void reportProgress('flow-connect.first', 1);
        void incrementProgress('flow-connect.ten');
        if (perfect) void reportProgress('flow-connect.perfect', 1);
        if (n === 9) void reportProgress('flow-connect.nine', 1);
        shell.endRound({
          won: true,
          score: scoreFor(n, puzzle.ends.length, moveCount, ms),
          timeMs: ms,
          title: perfect ? 'Perfect flow!' : 'All connected!',
          details: [
            { label: 'Grid', value: `${n}×${n}` },
            { label: 'Moves', value: `${moveCount} (best ${puzzle.ends.length})` },
          ],
        });
        return;
      }
      save.persist(
        { puzzle, paths: next, moves: moveCount, ms: read() },
        {
          percent: Math.round((filledCount(puzzle, next) / (n * n)) * 100),
          label: `${n}×${n} · ${connected}/${puzzle.ends.length} joined`,
        },
      );
    },
    [moves, n, puzzle, read, save, shell, started],
  );

  const startAt = useCallback(
    (cell: number) => {
      const res = begin(puzzle, pathsRef.current, cell);
      if (!res) return false;
      // A "move" is picking up a different flow than the one drawn last.
      const newMove = res.active !== lastFlow.current;
      lastFlow.current = res.active;
      activeRef.current = res.active;
      setActive(res.active);
      commit(res.paths, newMove);
      return true;
    },
    [commit, puzzle],
  );

  const moveInto = useCallback(
    (cell: number) => {
      const k = activeRef.current;
      if (k < 0) return;
      const next = advance(puzzle, pathsRef.current, k, cell);
      if (next) {
        commit(next, false);
        setCursor(cell);
      }
    },
    [commit, puzzle],
  );

  const drag = useCellDrag(
    n,
    n,
    {
      onStart: (cell) => {
        setCursor(cell);
        startAt(cell);
      },
      onEnter: moveInto,
      onEnd: () => {
        activeRef.current = -1;
        setActive(-1);
      },
    },
    !locked,
  );

  // Keyboard: arrows move a cursor; Enter picks up the flow under it, after
  // which arrows draw. Enter or Escape puts it down again.
  const onKeyDown = (e: KeyboardEvent) => {
    if (locked) return;
    const dirs: Record<string, number> = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in dirs) {
      e.preventDefault();
      const step = dirs[e.key];
      if ((step === -1 && cursor % n === 0) || (step === 1 && cursor % n === n - 1)) return;
      const target = cursor + step;
      if (target < 0 || target >= n * n) return;
      if (activeRef.current >= 0) moveInto(target);
      else setCursor(target);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (activeRef.current >= 0) {
        activeRef.current = -1;
        setActive(-1);
      } else startAt(cursor);
    } else if (e.key === 'Escape') {
      activeRef.current = -1;
      setActive(-1);
    }
  };

  const resume = () => {
    if (!pending) return;
    setPuzzle(pending.puzzle);
    setPaths(pending.paths);
    pathsRef.current = pending.paths;
    setMoves(pending.moves);
    reset(pending.ms);
    save.dismiss();
  };

  const centre = (c: number) => `${(c % n) + 0.5},${Math.floor(c / n) + 0.5}`;
  const connected = connectedCount(puzzle, paths);
  const filled = Math.round((filledCount(puzzle, paths) / (n * n)) * 100);

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Joined', value: `${connected}/${puzzle.ends.length}` },
          { label: 'Filled', value: `${filled}%` },
          { label: 'Moves', value: moves },
          { label: 'Time', value: formatClock(elapsed) },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`${pending.puzzle.n}×${pending.puzzle.n} · ${connectedCount(pending.puzzle, pending.paths)}/${pending.puzzle.ends.length} joined`}
          onContinue={resume}
          onNew={restart}
        />
      )}
      <StatusBar>
        {done
          ? 'Every pipe connected and every square filled!'
          : connected === puzzle.ends.length
            ? 'All pairs joined — now make the pipes fill every square.'
            : active >= 0
              ? `Drawing ${LETTERS[active]} — lead it to the other ${LETTERS[active]}.`
              : 'Drag from a dot to its matching dot. Pipes cannot cross.'}
      </StatusBar>
      <div
        className={`flow-board${done ? ' pz-win' : ''}`}
        style={{ ['--n' as string]: n }}
        role="application"
        tabIndex={0}
        aria-label={`Flow puzzle ${n} by ${n}. ${connected} of ${puzzle.ends.length} pairs joined, ${filled}% filled. Arrow keys move, Enter picks up a colour, then arrows draw.`}
        onKeyDown={onKeyDown}
        {...drag}
      >
        <svg viewBox={`0 0 ${n} ${n}`} className="flow-svg" aria-hidden="true">
          {Array.from({ length: n * n }, (_, c) => (
            <rect key={c} x={c % n} y={Math.floor(c / n)} width={1} height={1} className="flow-cell" />
          ))}
          {paths.map((p, k) =>
            p.map((c) => (
              <rect
                key={`${k}-${c}`}
                x={(c % n) + 0.04}
                y={Math.floor(c / n) + 0.04}
                width={0.92}
                height={0.92}
                fill={COLORS[k]}
                opacity={isConnected(puzzle, k, p) ? 0.28 : 0.16}
              />
            )),
          )}
          {paths.map((p, k) =>
            p.length > 1 ? (
              <polyline key={k} points={p.map(centre).join(' ')} stroke={COLORS[k]} className="flow-pipe" />
            ) : null,
          )}
          {puzzle.ends.map(([a, b], k) =>
            [a, b].map((c) => (
              <g key={`${k}-${c}`} transform={`translate(${(c % n) + 0.5} ${Math.floor(c / n) + 0.5})`}>
                <circle r={0.34} fill={COLORS[k]} className={active === k ? 'flow-end on' : 'flow-end'} />
                <text className="flow-letter" textAnchor="middle" dominantBaseline="central" fontSize={0.3}>
                  {LETTERS[k]}
                </text>
              </g>
            )),
          )}
          <rect
            x={(cursor % n) + 0.03}
            y={Math.floor(cursor / n) + 0.03}
            width={0.94}
            height={0.94}
            className="flow-cursor"
          />
        </svg>
      </div>
      <PuzzleActions>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => commit(puzzle.ends.map(() => []), false)}
          disabled={locked || !paths.some((p) => p.length)}
        >
          Clear pipes
        </button>
        <button type="button" className="btn btn-sm" onClick={restart} disabled={shell.paused}>
          🔀 New puzzle
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}

