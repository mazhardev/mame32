import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { formatClock } from '@/utils/format';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions } from '../_shared/puzzle/PuzzleUI';
import { LevelPicker } from '../_shared/puzzle/LevelPicker';
import { solvedInPack, usePackLevels } from '../_shared/puzzle/levels';
import { useStopwatch } from '../_shared/puzzle/useStopwatch';
import { CROWN, EMPTY, MARK, borders, conflicts, crownCount, cycle, generate, hint, isSolved, validCells } from './engine';
import type { Cell, Puzzle } from './engine';
import './crown.css';

const ID = 'crown-regions';
export const SIZES = { easy: 6, normal: 7, hard: 8 } as const;
export const LEVEL_COUNT = 30;
const PACK_NAMES = { easy: 'Easy 6×6', normal: 'Normal 7×7', hard: 'Hard 8×8' };
/** Soft, distinct region colours (light enough for dark crowns on top). */
const COLORS = ['#fca5a5', '#fdba74', '#fde68a', '#bef264', '#86efac', '#67e8f9', '#a5b4fc', '#f0abfc', '#d6d3d1'];

interface InProgress {
  cells: Cell[];
  ms: number;
  hints: number;
}

const levelCache = new Map<string, Puzzle>();
/** The same seed always gives the same level, so packs are fixed. */
export function levelPuzzle(n: number, index: number): Puzzle {
  const key = `${n}-${index}`;
  let p = levelCache.get(key);
  if (!p) {
    p = generate(n, createRng(`crown-regions-${n}-${index}`).next);
    levelCache.set(key, p);
  }
  return p;
}

export default function CrownRegionsGame() {
  const shell = useGameShell();
  const pack = shell.difficulty;
  const n = SIZES[pack];
  const validProgress = useCallback(
    (v: unknown): v is InProgress => {
      if (typeof v !== 'object' || v === null) return false;
      const s = v as Record<string, unknown>;
      return validCells(s.cells, n) && Number.isFinite(s.ms) && Number.isInteger(s.hints);
    },
    [n],
  );
  const levels = usePackLevels(ID, pack, LEVEL_COUNT, validProgress, shell.requestRestart, {
    packNames: PACK_NAMES,
    better: (a, b) => a < b,
  });
  const puzzle = useMemo(() => levelPuzzle(n, levels.index), [n, levels.index]);
  const [cells, setCells] = useState<Cell[]>(() => new Array(n * n).fill(EMPTY));
  const [hints, setHints] = useState(0);
  const [hinted, setHinted] = useState(-1);
  const [cursor, setCursor] = useState(0);
  const [autoMark, setAutoMark] = useState(false);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const cellsRef = useRef(cells);
  const dragMode = useRef<Cell | null>(null);
  const { elapsed, read, reset } = useStopwatch(started && !done && !shell.paused);

  const load = useCallback(
    (index: number) => {
      const saved = levels.savedFor(index);
      const next = saved ? saved.cells : new Array<Cell>(n * n).fill(EMPTY);
      cellsRef.current = next;
      setCells(next);
      setHints(saved ? saved.hints : 0);
      reset(saved ? saved.ms : 0);
      setStarted(!!saved);
      setHinted(-1);
      setDone(false);
    },
    [levels, n, reset],
  );

  useEffect(() => {
    if (levels.ready) load(levels.indexRef.current);
    // Only when progress first loads or the pack changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels.ready, pack]);

  const restart = useCallback(() => {
    levels.clearCurrent();
    const empty = new Array<Cell>(n * n).fill(EMPTY);
    cellsRef.current = empty;
    setCells(empty);
    setHints(0);
    setHinted(-1);
    setStarted(false);
    setDone(false);
    reset(0);
  }, [levels, n, reset]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const finish = useCallback(
    (hintCount: number) => {
      setDone(true);
      const ms = read();
      const index = levels.indexRef.current;
      const key = levels.key;
      levels.recordSolve(key, ms);
      shell.play('levelComplete');
      void reportProgress(`${ID}.first`, 1);
      void incrementProgress(`${ID}.ten`);
      if (hintCount === 0 && ms < 60_000) void reportProgress(`${ID}.fast`, 1);
      if (pack === 'hard' && hintCount === 0) void reportProgress(`${ID}.hard`, 1);
      if (solvedInPack({ ...levels.progress.solved, [key]: ms }, pack) === LEVEL_COUNT) void reportProgress(`${ID}.pack`, 1);
      shell.endRound({
        won: true,
        score: Math.max(100, n * 200 - Math.floor(ms / 1000) * 2 - hintCount * 150),
        timeMs: ms,
        title: hintCount === 0 ? 'Crowned! 👑' : 'Solved!',
        details: [
          { label: 'Level', value: `${PACK_NAMES[pack]} · ${index + 1}` },
          { label: 'Time', value: formatClock(ms) },
          { label: 'Hints', value: String(hintCount) },
        ],
        next: index < LEVEL_COUNT - 1 ? { label: 'Next level →', action: () => levels.select(index + 1) } : undefined,
      });
    },
    [levels, n, pack, read, shell],
  );

  const commit = useCallback(
    (next: Cell[], sound: 'tick' | 'pop' | null, hintCount = hints) => {
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      cellsRef.current = next;
      setCells(next);
      if (sound) shell.play(sound);
      if (isSolved(puzzle, next)) {
        levels.clearCurrent();
        finish(hintCount);
      } else {
        levels.saveCurrent(levels.key, { cells: next, ms: read(), hints: hintCount });
      }
    },
    [finish, hints, levels, puzzle, read, shell, started],
  );

  const setCell = useCallback(
    (i: number, v: Cell) => {
      const cur = cellsRef.current;
      if (cur[i] === v) return;
      const next = cur.slice();
      next[i] = v;
      // Optional: a new crown crosses out every cell it rules out.
      if (v === CROWN && autoMark) {
        const { n: size, regions } = puzzle;
        const x = i % size;
        const y = Math.floor(i / size);
        for (let j = 0; j < size * size; j++) {
          if (j === i || next[j] !== EMPTY) continue;
          const xj = j % size;
          const yj = Math.floor(j / size);
          if (xj === x || yj === y || regions[j] === regions[i] || (Math.abs(xj - x) <= 1 && Math.abs(yj - y) <= 1)) next[j] = MARK;
        }
      }
      const wasBad = conflicts(puzzle, cur).size;
      const bad = conflicts(puzzle, next).size;
      setHinted(-1);
      commit(next, v === CROWN ? (bad > wasBad ? null : 'pop') : 'tick');
      if (v === CROWN && bad > wasBad) shell.play('failure');
    },
    [autoMark, commit, puzzle, shell],
  );

  const locked = shell.paused || done || !levels.ready;

  // Tap cycles a cell; dragging from a cell paints ✕ (or clears, if you start on a ✕).
  const cellAt = (el: HTMLElement, x: number, y: number) => {
    const r = el.getBoundingClientRect();
    const c = Math.floor(((x - r.left) / r.width) * n);
    const row = Math.floor(((y - r.top) / r.height) * n);
    return c < 0 || row < 0 || c >= n || row >= n ? -1 : row * n + c;
  };
  const downCell = useRef(-1);
  const dragged = useRef(false);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (locked || e.button > 0) return;
    const i = cellAt(e.currentTarget, e.clientX, e.clientY);
    if (i < 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    downCell.current = i;
    dragged.current = false;
    const v = cellsRef.current[i];
    dragMode.current = v === MARK ? EMPTY : v === EMPTY ? MARK : null;
    setCursor(i);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (downCell.current < 0 || dragMode.current === null) return;
    const i = cellAt(e.currentTarget, e.clientX, e.clientY);
    if (i < 0 || (i === downCell.current && !dragged.current)) return;
    if (!dragged.current) {
      dragged.current = true;
      setCell(downCell.current, dragMode.current);
    }
    if (cellsRef.current[i] !== CROWN) setCell(i, dragMode.current);
  };
  const onPointerUp = () => {
    const i = downCell.current;
    downCell.current = -1;
    if (i >= 0 && !dragged.current && !locked) setCell(i, cycle(cellsRef.current[i]));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (locked) return;
    const moves: Record<string, number> = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in moves) {
      e.preventDefault();
      const step = moves[e.key];
      if ((step === -1 && cursor % n === 0) || (step === 1 && cursor % n === n - 1)) return;
      const t = cursor + step;
      if (t >= 0 && t < n * n) setCursor(t);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setCell(cursor, cycle(cells[cursor]));
    } else if (e.key.toLowerCase() === 'x') {
      setCell(cursor, cells[cursor] === MARK ? EMPTY : MARK);
    } else if (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'q') {
      setCell(cursor, cells[cursor] === CROWN ? EMPTY : CROWN);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      setCell(cursor, EMPTY);
    }
  };

  const giveHint = () => {
    if (locked) return;
    const h = hint(puzzle, cells);
    if (!h) return;
    const next = cells.slice();
    next[h.cell] = h.kind === 'place' ? CROWN : EMPTY;
    setHints(hints + 1);
    setHinted(h.cell);
    commit(next, 'pop', hints + 1);
  };

  const bad = conflicts(puzzle, cells);
  const placed = crownCount(cells);

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Level', value: `${levels.index + 1}/${LEVEL_COUNT}` },
          { label: 'Crowns', value: `${placed}/${n}` },
          { label: 'Time', value: formatClock(elapsed) },
          { label: 'Hints', value: hints },
        ]}
      />
      <LevelPicker
        pack={pack}
        count={LEVEL_COUNT}
        index={levels.index}
        solved={levels.progress.solved}
        onPick={levels.select}
        formatBest={(ms) => formatClock(ms)}
        disabled={shell.paused || !levels.ready}
      />
      <StatusBar>
        {done
          ? 'Every row, column and colour has its crown!'
          : bad.size
            ? 'Some crowns clash: two share a row, column or colour, or they touch.'
            : `Place ${n} crowns: one in each row, column and colour. Crowns may not touch, even diagonally.`}
      </StatusBar>
      <div
        className={`cr-board${done ? ' pz-win' : ''}`}
        style={{ ['--n' as string]: n }}
        role="grid"
        tabIndex={0}
        aria-label={`Crown Regions ${n} by ${n}, ${placed} of ${n} crowns placed. Arrow keys move, Space cycles a square, C places a crown, X a cross.`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {cells.map((v, i) => {
          const b = borders(puzzle, i);
          const cls = [
            'cr-cell',
            b.top && 'bt',
            b.right && 'br',
            b.bottom && 'bb',
            b.left && 'bl',
            i === cursor && 'cursor',
            bad.has(i) && 'bad',
            i === hinted && 'hinted',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div key={i} className={cls} style={{ background: COLORS[puzzle.regions[i]] }} aria-label={v === CROWN ? 'crown' : v === MARK ? 'crossed' : 'empty'}>
              {v === CROWN ? <span className="cr-crown">👑</span> : v === MARK ? <span className="cr-mark">✕</span> : null}
            </div>
          );
        })}
      </div>
      <PuzzleActions>
        <label className="cr-auto">
          <input type="checkbox" checked={autoMark} onChange={(e) => setAutoMark(e.target.checked)} /> Auto ✕
        </label>
        <button type="button" className="btn btn-sm" onClick={giveHint} disabled={locked}>
          💡 Hint
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => commit(new Array<Cell>(n * n).fill(EMPTY), 'tick')}
          disabled={locked || cells.every((v) => v === EMPTY)}
        >
          Clear
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
