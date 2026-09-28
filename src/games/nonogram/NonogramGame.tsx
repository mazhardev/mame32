import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { formatClock } from '@/utils/format';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions, ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { useStopwatch } from '../_shared/puzzle/useStopwatch';
import { useGridCursor } from '../_shared/puzzle/useGridCursor';
import {
  EMPTY,
  FILLED,
  SIZES,
  UNKNOWN,
  cluesFor,
  doneLines,
  encodeSolution,
  makePuzzle,
  matchesClues,
  scoreFor,
  validSave,
} from './engine';
import type { Mark, Puzzle } from './engine';
import { PICTURES_10, PICTURES_5 } from './pictures';
import './nonogram.css';

const ID = 'nonogram';

function picturesFor(n: number) {
  return n === 5 ? PICTURES_5 : n === 10 ? PICTURES_10 : [];
}

interface Drag {
  paint: Mark;
  /** Only cells currently holding this value are changed by the stroke. */
  from: Mark;
  start: number;
  axis: 'row' | 'col' | null;
  base: Mark[];
}

export default function NonogramGame() {
  const shell = useGameShell();
  const n = SIZES[shell.difficulty];
  const save = useSavedGame(ID, validSave);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => makePuzzle(n, picturesFor(n), Math.random));
  const [marks, setMarks] = useState<Mark[]>(() => Array<Mark>(n * n).fill(UNKNOWN));
  const [history, setHistory] = useState<Mark[][]>([]);
  const [mode, setMode] = useState<'fill' | 'cross'>('fill');
  const [checks, setChecks] = useState(0);
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const { elapsed, read, reset } = useStopwatch(started && !done && !shell.paused);
  const drag = useRef<Drag | null>(null);
  const marksRef = useRef(marks);
  marksRef.current = marks;
  const errorTimer = useRef<number | undefined>();
  const { cellProps } = useGridCursor(n, n);

  const clues = useMemo(() => cluesFor(puzzle.solution, n), [puzzle, n]);
  const lines = useMemo(() => doneLines(marks, clues.rows, clues.cols), [marks, clues]);
  const pending = save.saved && save.saved.n === n ? save.saved : null;
  const locked = shell.paused || done || !!pending || save.loading;

  const restart = useCallback(() => {
    setPuzzle((prev) => makePuzzle(n, picturesFor(n), Math.random, prev.name));
    setMarks(Array<Mark>(n * n).fill(UNKNOWN));
    setHistory([]);
    setChecks(0);
    setErrors(new Set());
    setStarted(false);
    setDone(false);
    reset(0);
    save.clear();
  }, [n, reset, save]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => () => window.clearTimeout(errorTimer.current), []);

  const commit = useCallback(
    (next: Mark[], before: Mark[]) => {
      if (next.every((m, i) => m === before[i])) return;
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      setHistory((h) => [...h.slice(-99), before]);
      if (matchesClues(next, clues.rows, clues.cols)) {
        setDone(true);
        const ms = read();
        save.clear();
        shell.play('levelComplete');
        void reportProgress('nonogram.first', 1);
        void incrementProgress('nonogram.ten');
        if (n >= 10) void reportProgress('nonogram.ten-by-ten', 1);
        if (n === 15) void reportProgress('nonogram.fifteen', 1);
        if (n >= 10 && checks === 0) void reportProgress('nonogram.clean', 1);
        if (n === 5 && ms < 60_000) void reportProgress('nonogram.quick', 1);
        shell.endRound({
          won: true,
          score: scoreFor(n, ms, checks),
          timeMs: ms,
          title: puzzle.name === 'Mystery pattern' ? 'Pattern complete!' : `It's a ${puzzle.name.toLowerCase()}!`,
          details: [
            { label: 'Grid', value: `${n}×${n}` },
            { label: 'Checks used', value: String(checks) },
          ],
        });
        return;
      }
      shell.play('click');
      const filled = next.filter((m) => m === FILLED).length;
      const target = puzzle.solution.filter(Boolean).length;
      save.persist(
        {
          n,
          name: puzzle.name,
          solution: encodeSolution(puzzle.solution),
          marks: next,
          ms: read(),
          checks,
        },
        {
          percent: Math.min(99, Math.round((filled / Math.max(1, target)) * 100)),
          label: `${n}×${n} · ${Math.min(99, Math.round((filled / Math.max(1, target)) * 100))}% filled`,
        },
      );
    },
    [checks, clues, n, puzzle, read, save, shell, started],
  );

  /** Applies a stroke from drag.start to `cell`, constrained to one row or column. */
  const paintTo = (cell: number) => {
    const d = drag.current;
    if (!d) return;
    const [sr, sc] = [Math.floor(d.start / n), d.start % n];
    const [r, c] = [Math.floor(cell / n), cell % n];
    if (!d.axis && cell !== d.start) d.axis = Math.abs(r - sr) > Math.abs(c - sc) ? 'col' : 'row';
    const next = d.base.slice();
    const cells: number[] = [];
    if (d.axis === 'row') for (let x = Math.min(sc, c); x <= Math.max(sc, c); x++) cells.push(sr * n + x);
    else if (d.axis === 'col') for (let y = Math.min(sr, r); y <= Math.max(sr, r); y++) cells.push(y * n + sc);
    else cells.push(d.start);
    for (const i of cells) if (d.base[i] === d.from) next[i] = d.paint;
    setMarks(next);
  };

  const onPointerDown = (i: number, e: ReactPointerEvent) => {
    if (locked) return;
    e.preventDefault();
    const crossing = e.button === 2 || mode === 'cross';
    const target: Mark = crossing ? EMPTY : FILLED;
    const current = marks[i];
    const paint: Mark = current === target ? UNKNOWN : target;
    const from: Mark = current === target ? target : current === UNKNOWN ? UNKNOWN : current;
    drag.current = { paint, from, start: i, axis: null, base: marks.slice() };
    (e.currentTarget.parentElement as HTMLElement).setPointerCapture?.(e.pointerId);
    paintTo(i);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const cell = el?.dataset.cell;
    if (cell !== undefined) paintTo(Number(cell));
  };

  const endStroke = () => {
    const d = drag.current;
    drag.current = null;
    if (d) commit(marksRef.current, d.base);
  };

  const onCellKey = (i: number, e: KeyboardEvent) => {
    if (locked) return;
    const key = e.key.toLowerCase();
    let value: Mark | null = null;
    if (key === ' ' || key === 'enter') value = marks[i] === FILLED ? UNKNOWN : mode === 'cross' ? EMPTY : FILLED;
    else if (key === 'x') value = marks[i] === EMPTY ? UNKNOWN : EMPTY;
    else if (key === 'backspace' || key === 'delete') value = UNKNOWN;
    if (value === null) return cellProps(i).onKeyDown(e);
    e.preventDefault();
    const next = marks.slice();
    next[i] = value;
    setMarks(next);
    commit(next, marks);
  };

  const undo = () => {
    if (locked || !history.length) return;
    const prev = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setMarks(prev);
  };

  const check = () => {
    if (locked) return;
    const wrong = new Set<number>();
    marks.forEach((m, i) => {
      if (m === FILLED && !puzzle.solution[i]) wrong.add(i);
      if (m === EMPTY && puzzle.solution[i]) wrong.add(i);
    });
    setChecks(checks + 1);
    setErrors(wrong);
    shell.play(wrong.size ? 'failure' : 'success');
    window.clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setErrors(new Set()), 2500);
  };

  const resume = () => {
    if (!pending) return;
    setPuzzle({
      n: pending.n,
      name: pending.name,
      solution: pending.solution.split('').map((ch) => ch === '1'),
    });
    setMarks(pending.marks);
    setChecks(pending.checks);
    reset(pending.ms);
    save.dismiss();
  };

  const rcWidth = Math.max(...clues.rows.map((c) => Math.max(1, c.length)));
  const ccHeight = Math.max(...clues.cols.map((c) => Math.max(1, c.length)));

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Time', value: formatClock(elapsed) },
          { label: 'Grid', value: `${n}×${n}` },
          { label: 'Checks', value: checks },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`${pending.n}×${pending.n} picture · ${formatClock(pending.ms)}`}
          onContinue={resume}
          onNew={restart}
        />
      )}
      <StatusBar>
        {done
          ? puzzle.name === 'Mystery pattern'
            ? 'Solved!'
            : `Solved — it's a ${puzzle.name.toLowerCase()}!`
          : errors.size
            ? `${errors.size} cell${errors.size === 1 ? ' is' : 's are'} wrong (outlined in red).`
            : 'Fill cells so every row and column matches its numbers.'}
      </StatusBar>
      <div className="scroll-x nono-scroll">
        <div
          className={`nono${done ? ' solved pz-win' : ''}`}
          style={{ ['--n' as string]: n, ['--rc' as string]: rcWidth, ['--cc' as string]: ccHeight }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="nono-corner" aria-hidden="true" />
          <div className="nono-colclues" aria-hidden="true">
            {clues.cols.map((clue, c) => (
              <div key={c} className={`nono-cc${lines.cols[c] ? ' ok' : ''}${c % 5 === 4 ? ' edge' : ''}`}>
                {(clue.length ? clue : [0]).map((v, k) => (
                  <span key={k}>{v}</span>
                ))}
              </div>
            ))}
          </div>
          <div className="nono-rowclues" aria-hidden="true">
            {clues.rows.map((clue, r) => (
              <div key={r} className={`nono-rc${lines.rows[r] ? ' ok' : ''}${r % 5 === 4 ? ' edge' : ''}`}>
                {(clue.length ? clue : [0]).map((v, k) => (
                  <span key={k}>{v}</span>
                ))}
              </div>
            ))}
          </div>
          <div
            className="nono-grid"
            role="grid"
            aria-label={`Nonogram ${n} by ${n}`}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
          >
            {marks.map((m, i) => {
              const r = Math.floor(i / n);
              const c = i % n;
              const props = cellProps(i);
              return (
                <button
                  key={i}
                  type="button"
                  data-cell={i}
                  className={`nono-cell${m === FILLED ? ' fill' : m === EMPTY ? ' cross' : ''}${errors.has(i) ? ' err' : ''}${c % 5 === 4 && c < n - 1 ? ' vr' : ''}${r % 5 === 4 && r < n - 1 ? ' hr' : ''}`}
                  tabIndex={props.tabIndex}
                  ref={props.ref}
                  onFocus={props.onFocus}
                  onKeyDown={(e) => onCellKey(i, e)}
                  onPointerDown={(e) => onPointerDown(i, e)}
                  disabled={locked}
                  aria-label={`Row ${r + 1} (clue ${clues.rows[r].join(' ') || '0'}), column ${c + 1} (clue ${clues.cols[c].join(' ') || '0'}): ${m === FILLED ? 'filled' : m === EMPTY ? 'crossed out' : 'blank'}`}
                />
              );
            })}
          </div>
        </div>
      </div>
      <PuzzleActions>
        <div className="seg" role="radiogroup" aria-label="Tool">
          <button type="button" role="radio" aria-checked={mode === 'fill'} className={mode === 'fill' ? 'on' : ''} onClick={() => setMode('fill')}>
            ■ Fill
          </button>
          <button type="button" role="radio" aria-checked={mode === 'cross'} className={mode === 'cross' ? 'on' : ''} onClick={() => setMode('cross')}>
            ✕ Cross
          </button>
        </div>
        <button type="button" className="btn btn-sm" onClick={undo} disabled={locked || !history.length}>
          ↶ Undo
        </button>
        <button type="button" className="btn btn-sm" onClick={check} disabled={locked}>
          🔍 Check
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
