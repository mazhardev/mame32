import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions, ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { isIntArray, isRecord, useSavedGame } from '../_shared/puzzle/useSavedGame';
import { useGridCursor } from '../_shared/puzzle/useGridCursor';
import { SIZES, conflicts, generate, isSolved } from './engine';
import type { Cell, Grid, Puzzle } from './engine';
import './binary.css';

const ID = 'binary-puzzle';

interface Saved {
  n: number;
  givens: Grid;
  solution: Grid;
  grid: Grid;
  seconds: number;
  hints: number;
}

function validSave(v: unknown): v is Saved {
  if (!isRecord(v) || typeof v.n !== 'number' || ![6, 8, 10].includes(v.n)) return false;
  const len = v.n * v.n;
  return (
    isIntArray(v.givens, len, -1, 1) &&
    isIntArray(v.solution, len, 0, 1) &&
    isIntArray(v.grid, len, -1, 1) &&
    typeof v.seconds === 'number' &&
    typeof v.hints === 'number'
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function BinaryPuzzleGame() {
  const shell = useGameShell();
  const n = SIZES[shell.difficulty];
  const save = useSavedGame(ID, validSave);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generate(n, Math.random));
  const [grid, setGrid] = useState<Grid>(puzzle.givens);
  const [seconds, setSeconds] = useState(0);
  const [hints, setHints] = useState(0);
  const [showErrors, setShowErrors] = useState(true);
  const [done, setDone] = useState(false);
  const started = useRef(false);
  const [running, setRunning] = useState(false);
  const { cellProps } = useGridCursor(n, n, 0);

  const pending = save.saved && save.saved.n === n ? save.saved : null;
  const locked = shell.paused || done || !!pending || save.loading;

  useEffect(() => {
    if (locked || !running) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [locked, running]);

  const fresh = useCallback(() => {
    const p = generate(SIZES[shell.difficulty], Math.random);
    setPuzzle(p);
    setGrid(p.givens);
    setSeconds(0);
    setHints(0);
    setDone(false);
    started.current = false;
    setRunning(false);
  }, [shell.difficulty]);
  const restart = useCallback(() => {
    fresh();
    save.clear();
  }, [fresh, save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  // The stored difficulty can arrive after the first render: match it without touching the save.
  useEffect(() => {
    if (puzzle.n !== n && !started.current) fresh();
  }, [n, puzzle.n, fresh]);

  const finish = (hintCount: number) => {
    setDone(true);
    save.clear();
    shell.play('levelComplete');
    void reportProgress('binary-puzzle.first', 1);
    if (n === 10) void reportProgress('binary-puzzle.big', 1);
    if (hintCount === 0 && n >= 8) void reportProgress('binary-puzzle.no-hints', 1);
    void incrementProgress('binary-puzzle.solved');
    const base = { 6: 300, 8: 600, 10: 1000 }[n] ?? 300;
    shell.endRound({
      won: true,
      score: Math.max(50, base - seconds - hintCount * 50),
      timeMs: seconds * 1000,
      title: 'Solved!',
      details: [
        { label: 'Size', value: `${n}×${n}` },
        { label: 'Time', value: fmt(seconds) },
        { label: 'Hints', value: String(hintCount) },
      ],
    });
  };

  const setCell = (i: number, v: Cell) => {
    if (locked || puzzle.givens[i] !== -1) return;
    if (!started.current) {
      started.current = true;
      setRunning(true);
      shell.startRound();
    }
    const next = [...grid];
    next[i] = v;
    setGrid(next);
    shell.play('click');
    if (isSolved(next, n)) finish(hints);
    else save.persist({ n, givens: puzzle.givens, solution: puzzle.solution, grid: next, seconds, hints }, { label: `${n}×${n} · ${Math.round((next.filter((c) => c !== -1).length / (n * n)) * 100)}% filled`, percent: (next.filter((c) => c !== -1).length / (n * n)) * 100 });
  };

  const cycle = (i: number) => setCell(i, grid[i] === -1 ? 0 : grid[i] === 0 ? 1 : -1);

  const hint = () => {
    if (locked) return;
    // Fix a wrong cell first, otherwise fill an empty one.
    const wrong = grid.findIndex((c, i) => c !== -1 && c !== puzzle.solution[i]);
    const target = wrong >= 0 ? wrong : grid.findIndex((c) => c === -1);
    if (target < 0) return;
    setHints((h) => h + 1);
    setCell(target, puzzle.solution[target]);
  };

  const resume = () => {
    if (!pending) return;
    setPuzzle({ n: pending.n, givens: pending.givens, solution: pending.solution });
    setGrid(pending.grid);
    setSeconds(pending.seconds);
    setHints(pending.hints);
    // The shell round (and the clock) starts again with the next move.
    started.current = false;
    save.dismiss();
  };

  const bad = useMemo(() => (showErrors ? conflicts(grid, n) : new Set<number>()), [grid, n, showErrors]);
  const filled = grid.filter((c) => c !== -1).length;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Size', value: `${n}×${n}` },
          { label: 'Filled', value: `${Math.round((filled / (n * n)) * 100)}%` },
          { label: 'Time', value: fmt(seconds) },
        ]}
      />
      {pending && <ResumePrompt label={`${pending.n}×${pending.n} · ${fmt(pending.seconds)}`} onContinue={resume} onNew={restart} />}
      <StatusBar>{done ? 'Solved!' : 'No three in a row, equal 0s and 1s per line, no identical lines.'}</StatusBar>
      <div className={`pz-grid bin-grid${done ? ' pz-win' : ''}`} style={{ ['--n' as string]: n, ['--max' as string]: '480px' }} role="group" aria-label={`Binary puzzle ${n} by ${n}`}>
        {grid.map((c, i) => {
          const given = puzzle.givens[i] !== -1;
          return (
            <button
              key={i}
              type="button"
              className={`pz-cell bin-cell${given ? ' given' : ''}${c === 0 ? ' zero' : c === 1 ? ' one' : ''}${bad.has(i) ? ' bad' : ''}`}
              onClick={() => cycle(i)}
              onKeyDown={(e) => {
                if (e.key === '0' || e.key === '1') {
                  e.preventDefault();
                  setCell(i, Number(e.key) as Cell);
                } else if (e.key === 'Backspace' || e.key === 'Delete') {
                  e.preventDefault();
                  setCell(i, -1);
                } else cellProps(i).onKeyDown(e);
              }}
              disabled={locked && !given}
              aria-label={`Row ${Math.floor(i / n) + 1}, column ${(i % n) + 1}: ${c === -1 ? 'empty' : c}${given ? ', given' : ''}${bad.has(i) ? ', breaks a rule' : ''}`}
              tabIndex={cellProps(i).tabIndex}
              ref={cellProps(i).ref}
              onFocus={cellProps(i).onFocus}
            >
              {c === -1 ? '' : c}
            </button>
          );
        })}
      </div>
      <PuzzleActions>
        <button type="button" className="btn" onClick={hint} disabled={locked}>
          💡 Hint
        </button>
        <label className="row small" style={{ gap: 6 }}>
          <input type="checkbox" checked={showErrors} onChange={(e) => setShowErrors(e.target.checked)} /> Show rule breaks
        </label>
        <button type="button" className="btn" onClick={restart} disabled={shell.paused}>
          🔀 New puzzle
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
