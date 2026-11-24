import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { formatClock } from '@/utils/format';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions } from '../_shared/puzzle/PuzzleUI';
import { LevelPicker } from '../_shared/puzzle/LevelPicker';
import { solvedInPack, usePackLevels } from '../_shared/puzzle/levels';
import { useStopwatch } from '../_shared/puzzle/useStopwatch';
import { useCellDrag } from '../_shared/puzzle/useCellDrag';
import { clueNumber, isSolved, reached, step, validPath } from './engine';
import { LEVELS } from './levels';
import './path.css';

const ID = 'number-path';
const PACK_NAMES = { easy: 'Easy 5×5', normal: 'Normal 6×6', hard: 'Hard 7×7' };

interface InProgress {
  path: number[];
  ms: number;
  hints: number;
}

export default function NumberPathGame() {
  const shell = useGameShell();
  const pack = shell.difficulty;
  const list = LEVELS[pack];
  const validProgress = useCallback(
    (v: unknown): v is InProgress => {
      if (typeof v !== 'object' || v === null) return false;
      const s = v as Record<string, unknown>;
      // The path is checked against level 0's size here; load() re-checks against the real level.
      return Array.isArray(s.path) && Number.isFinite(s.ms) && Number.isInteger(s.hints);
    },
    [],
  );
  const levels = usePackLevels(ID, pack, list.length, validProgress, shell.requestRestart, {
    packNames: PACK_NAMES,
    better: (a, b) => a < b,
  });
  const puzzle = list[levels.index] ?? list[0];
  const { w, h } = puzzle;
  const [path, setPath] = useState<number[]>([]);
  const [hints, setHints] = useState(0);
  const [cursor, setCursor] = useState(puzzle.clues[0]);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const pathRef = useRef<number[]>([]);
  const { elapsed, read, reset } = useStopwatch(started && !done && !shell.paused);

  const load = useCallback(
    (index: number) => {
      const p = list[index];
      const saved = levels.savedFor(index);
      const next = saved && validPath(p, saved.path) ? saved.path : [];
      pathRef.current = next;
      setPath(next);
      setHints(saved ? saved.hints : 0);
      reset(saved ? saved.ms : 0);
      setStarted(!!saved);
      setCursor(next.length ? next[next.length - 1] : p.clues[0]);
      setDone(false);
    },
    [levels, list, reset],
  );

  useEffect(() => {
    if (levels.ready) load(levels.indexRef.current);
    // Only when progress first loads or the pack changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels.ready, pack]);

  const restart = useCallback(() => {
    levels.clearCurrent();
    pathRef.current = [];
    setPath([]);
    setHints(0);
    setStarted(false);
    setDone(false);
    reset(0);
    setCursor(list[levels.indexRef.current].clues[0]);
  }, [levels, list, reset]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const finish = useCallback(
    (hintCount: number) => {
      setDone(true);
      const ms = read();
      const index = levels.indexRef.current;
      const key = levels.key;
      levels.recordSolve(key, ms);
      levels.clearCurrent();
      shell.play('levelComplete');
      void reportProgress(`${ID}.first`, 1);
      void incrementProgress(`${ID}.ten`);
      if (hintCount === 0 && ms < 45_000) void reportProgress(`${ID}.fast`, 1);
      if (pack === 'hard' && hintCount === 0) void reportProgress(`${ID}.hard`, 1);
      if (solvedInPack({ ...levels.progress.solved, [key]: ms }, pack) === list.length) void reportProgress(`${ID}.pack`, 1);
      shell.endRound({
        won: true,
        score: Math.max(100, w * h * 12 - Math.floor(ms / 1000) * 2 - hintCount * 120),
        timeMs: ms,
        title: hintCount === 0 ? 'Path complete! ✨' : 'Path complete!',
        details: [
          { label: 'Level', value: `${PACK_NAMES[pack]} · ${index + 1}` },
          { label: 'Time', value: formatClock(ms) },
          { label: 'Hints', value: String(hintCount) },
        ],
        next: index < list.length - 1 ? { label: 'Next level →', action: () => levels.select(index + 1) } : undefined,
      });
    },
    [h, levels, list.length, pack, read, shell, w],
  );

  const commit = useCallback(
    (next: number[], hintCount = hints) => {
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      const before = reached(puzzle, pathRef.current);
      pathRef.current = next;
      setPath(next);
      if (next.length) setCursor(next[next.length - 1]);
      if (isSolved(puzzle, next)) {
        finish(hintCount);
        return;
      }
      const after = reached(puzzle, next);
      shell.play(after > before ? 'pop' : 'tick');
      levels.saveCurrent(levels.key, { path: next, ms: read(), hints: hintCount });
    },
    [finish, hints, levels, puzzle, read, shell, started],
  );

  const tryStep = useCallback(
    (cell: number) => {
      const next = step(puzzle, pathRef.current, cell);
      if (next) commit(next);
      return !!next;
    },
    [commit, puzzle],
  );

  const locked = shell.paused || done || !levels.ready;
  const drag = useCellDrag(
    w,
    h,
    {
      onStart: (cell) => {
        const cur = pathRef.current;
        // Start from 1, or carry on from (or cut back to) any square on the line.
        if (!cur.length) tryStep(cell);
        else if (cur.includes(cell)) {
          if (cell !== cur[cur.length - 1]) commit(cur.slice(0, cur.indexOf(cell) + 1));
        } else tryStep(cell);
      },
      onEnter: (cell) => {
        tryStep(cell);
      },
    },
    !locked,
  );

  const onKeyDown = (e: KeyboardEvent) => {
    if (locked) return;
    const moves: Record<string, number> = { ArrowUp: -w, ArrowDown: w, ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in moves) {
      e.preventDefault();
      const d = moves[e.key];
      if ((d === -1 && cursor % w === 0) || (d === 1 && cursor % w === w - 1)) return;
      const t = cursor + d;
      if (t < 0 || t >= w * h) return;
      if (!pathRef.current.length) tryStep(puzzle.clues[0]);
      if (!tryStep(t)) setCursor(t);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (pathRef.current.length > 1) commit(pathRef.current.slice(0, -1));
    }
  };

  const giveHint = () => {
    if (locked) return;
    // Keep the part of the line that matches the solution and add the next square.
    const sol = puzzle.solution;
    let k = 0;
    while (k < path.length && path[k] === sol[k]) k++;
    const next = sol.slice(0, Math.min(sol.length, k + 1));
    setHints(hints + 1);
    commit(next, hints + 1);
  };

  const centre = (c: number) => `${(c % w) + 0.5},${Math.floor(c / w) + 0.5}`;
  const got = reached(puzzle, path);
  const filled = Math.round((path.length / (w * h)) * 100);
  const onPath = new Set(path);

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Level', value: `${levels.index + 1}/${list.length}` },
          { label: 'Numbers', value: `${got}/${puzzle.clues.length}` },
          { label: 'Filled', value: `${filled}%` },
          { label: 'Time', value: formatClock(elapsed) },
        ]}
      />
      <LevelPicker
        pack={pack}
        count={list.length}
        index={levels.index}
        solved={levels.progress.solved}
        onPick={levels.select}
        formatBest={(ms) => formatClock(ms)}
        disabled={shell.paused || !levels.ready}
      />
      <StatusBar>
        {done
          ? 'One line, every square, every number in order!'
          : !path.length
            ? 'Start on 1 and drag through every square, passing the numbers in order.'
            : got === puzzle.clues.length - 1 && path.length < w * h - 1
              ? `Fill the remaining ${w * h - path.length - 1} square${w * h - path.length - 1 === 1 ? '' : 's'} before finishing on ${puzzle.clues.length}.`
              : `Next number: ${got + 1}. Drag back along the line to undo.`}
      </StatusBar>
      <div
        className={`np-board${done ? ' pz-win' : ''}`}
        style={{ ['--n' as string]: w }}
        role="application"
        tabIndex={0}
        aria-label={`Number Path ${w} by ${h}. ${got} of ${puzzle.clues.length} numbers reached, ${filled}% filled. Arrow keys draw the line, Backspace takes back a square.`}
        onKeyDown={onKeyDown}
        {...drag}
      >
        <svg viewBox={`0 0 ${w} ${h}`} className="np-svg" aria-hidden="true">
          {Array.from({ length: w * h }, (_, c) => (
            <rect key={c} x={c % w} y={Math.floor(c / w)} width={1} height={1} className={onPath.has(c) ? 'np-cell on' : 'np-cell'} />
          ))}
          {path.length > 1 && <polyline points={path.map(centre).join(' ')} className="np-line" />}
          {path.length > 0 && (
            <circle cx={(path[path.length - 1] % w) + 0.5} cy={Math.floor(path[path.length - 1] / w) + 0.5} r={0.2} className="np-head" />
          )}
          {puzzle.clues.map((c, k) => (
            <g key={c} transform={`translate(${(c % w) + 0.5} ${Math.floor(c / w) + 0.5})`}>
              <circle r={0.33} className={k < got ? 'np-dot hit' : 'np-dot'} />
              <text textAnchor="middle" dominantBaseline="central" className="np-num" fontSize={0.34}>
                {clueNumber(puzzle, c)}
              </text>
            </g>
          ))}
          <rect x={(cursor % w) + 0.04} y={Math.floor(cursor / w) + 0.04} width={0.92} height={0.92} className="np-cursor" />
        </svg>
      </div>
      <PuzzleActions>
        <button type="button" className="btn btn-sm" onClick={() => commit(path.slice(0, -1))} disabled={locked || path.length < 2}>
          ↶ Undo
        </button>
        <button type="button" className="btn btn-sm" onClick={giveHint} disabled={locked}>
          💡 Hint
        </button>
        <button type="button" className="btn btn-sm" onClick={() => commit([])} disabled={locked || !path.length}>
          Clear
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
