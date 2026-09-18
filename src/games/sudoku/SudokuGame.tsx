import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { clearProgress, loadProgress, saveProgress } from '@/storage/StorageService';
import { formatClock } from '@/utils/format';
import {
  CLUES,
  SIZE,
  colOf,
  findConflicts,
  generatePuzzle,
  isComplete,
  percentComplete,
  rowOf,
  boxOf,
} from './engine';
import type { Board } from './engine';

const GAME_ID = 'sudoku';
const BASE_SCORE = { easy: 1000, normal: 2000, hard: 3500 } as const;

interface SavedState {
  puzzle: Board;
  solution: Board;
  givens: boolean[];
  board: Board;
  notes: number[][];
  elapsed: number;
  hints: number;
  mistakes: number;
  difficulty: string;
}

function emptyNotes() {
  return Array.from({ length: 81 }, () => [] as number[]);
}

export default function SudokuGame() {
  const shell = useGameShell();
  const [state, setState] = useState<SavedState | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [restored, setRestored] = useState(false);
  const [tick, setTick] = useState(0);

  const timerRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  const finishedRef = useRef(false);
  const elapsedBaseRef = useRef(0);
  const runStartRef = useRef<number | null>(null);

  useEffect(() => {
    shell.setCapabilities({ pausable: false });
  }, [shell]);

  const buildPuzzle = useCallback((difficulty: 'easy' | 'normal' | 'hard'): SavedState => {
    const { puzzle, solution, givens } = generatePuzzle(CLUES[difficulty]);
    return {
      puzzle,
      solution,
      givens,
      board: puzzle.slice(),
      notes: emptyNotes(),
      elapsed: 0,
      hints: 0,
      mistakes: 0,
      difficulty,
    };
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    runStartRef.current = Date.now();
    timerRef.current = window.setInterval(() => setTick((t) => t + 1), 500);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (runStartRef.current) {
      elapsedBaseRef.current += Date.now() - runStartRef.current;
      runStartRef.current = null;
    }
  }, []);

  const elapsed =
    elapsedBaseRef.current + (runStartRef.current ? Date.now() - runStartRef.current : 0);

  // Restore a saved grid, otherwise generate a new puzzle.
  useEffect(() => {
    let alive = true;
    void loadProgress<SavedState>(GAME_ID).then((saved) => {
      if (!alive) return;
      if (saved && saved.difficulty === shell.difficulty && Array.isArray(saved.board)) {
        setState(saved);
        elapsedBaseRef.current = saved.elapsed;
        setRestored(true);
        startedRef.current = true;
        startTimer();
      } else {
        setState(buildPuzzle(shell.difficulty));
      }
    });
    return () => {
      alive = false;
      stopTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restart = useCallback(() => {
    stopTimer();
    elapsedBaseRef.current = 0;
    finishedRef.current = false;
    startedRef.current = false;
    setRestored(false);
    setSelected(null);
    setState(buildPuzzle(shell.difficulty));
    void clearProgress(GAME_ID);
  }, [buildPuzzle, shell.difficulty, stopTimer]);

  useEffect(() => {
    shell.registerRestart(restart);
  }, [shell, restart]);

  const persist = useCallback((next: SavedState) => {
    const percent = percentComplete(next.board, next.givens);
    void saveProgress(
      GAME_ID,
      { ...next, elapsed: elapsedBaseRef.current },
      { percent, label: `${Math.round(percent)}% complete · ${next.difficulty}` },
    );
  }, []);

  const conflicts = useMemo(
    () => (state ? findConflicts(state.board) : new Set<number>()),
    [state],
  );

  const finish = useCallback(
    (next: SavedState) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      stopTimer();
      const total = elapsedBaseRef.current;
      const base = BASE_SCORE[next.difficulty as 'easy' | 'normal' | 'hard'] ?? 1000;
      const timeBonus = Math.max(0, Math.round(base * 0.4 - total / 1000));
      const score = Math.max(100, base + timeBonus - next.hints * 120 - next.mistakes * 40);

      void reportProgress('sudoku.first-solve', 1);
      void reportProgress('sudoku.solve-10', 1);
      if (next.difficulty === 'hard') void reportProgress('sudoku.hard-solve', 1);
      if (next.hints === 0) void reportProgress('sudoku.no-hints', 1);
      if (next.mistakes === 0) void reportProgress('sudoku.no-mistakes', 1);
      if (next.difficulty === 'easy' && total < 300_000) void reportProgress('sudoku.fast', 1);

      void clearProgress(GAME_ID);
      shell.endRound({
        score,
        won: true,
        timeMs: total,
        title: 'Puzzle solved!',
        details: [
          { label: 'Difficulty', value: next.difficulty },
          { label: 'Hints used', value: String(next.hints) },
          { label: 'Mistakes', value: String(next.mistakes) },
        ],
        mode: next.difficulty,
      });
    },
    [shell, stopTimer],
  );

  const applyValue = useCallback(
    (value: number) => {
      if (!state || selected === null || finishedRef.current) return;
      if (state.givens[selected]) return;

      if (!startedRef.current) {
        startedRef.current = true;
        shell.startRound();
        startTimer();
      }

      const next: SavedState = {
        ...state,
        board: state.board.slice(),
        notes: state.notes.map((n) => n.slice()),
      };

      if (noteMode && value !== 0) {
        const cellNotes = next.notes[selected];
        const at = cellNotes.indexOf(value);
        if (at >= 0) cellNotes.splice(at, 1);
        else cellNotes.push(value);
        next.board[selected] = 0;
        shell.play('tick');
      } else {
        next.board[selected] = value;
        next.notes[selected] = [];
        if (value !== 0) {
          if (value === state.solution[selected]) {
            shell.play('click');
          } else {
            next.mistakes += 1;
            shell.play('failure');
            shell.vibrate(60);
          }
        }
      }

      setState(next);
      persist(next);
      if (isComplete(next.board)) {
        shell.play('levelComplete');
        finish(next);
      }
    },
    [finish, noteMode, persist, selected, shell, startTimer, state],
  );

  const useHint = useCallback(() => {
    if (!state || selected === null || state.givens[selected] || finishedRef.current) return;
    if (!startedRef.current) {
      startedRef.current = true;
      shell.startRound();
      startTimer();
    }
    const next: SavedState = {
      ...state,
      board: state.board.slice(),
      notes: state.notes.map((n) => n.slice()),
      hints: state.hints + 1,
    };
    next.board[selected] = state.solution[selected];
    next.notes[selected] = [];
    setState(next);
    persist(next);
    shell.play('powerup');
    if (isComplete(next.board)) finish(next);
  }, [finish, persist, selected, shell, startTimer, state]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key >= '1' && e.key <= '9') {
        applyValue(Number(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        applyValue(0);
      } else if (e.key === 'n' || e.key === 'N') {
        setNoteMode((v) => !v);
      } else if (e.key.startsWith('Arrow') && selected !== null) {
        e.preventDefault();
        const row = rowOf(selected);
        const col = colOf(selected);
        const delta =
          e.key === 'ArrowUp'
            ? [-1, 0]
            : e.key === 'ArrowDown'
              ? [1, 0]
              : e.key === 'ArrowLeft'
                ? [0, -1]
                : [0, 1];
        const nextRow = Math.min(8, Math.max(0, row + delta[0]));
        const nextCol = Math.min(8, Math.max(0, col + delta[1]));
        setSelected(nextRow * SIZE + nextCol);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [applyValue, selected]);

  if (!state) {
    return (
      <div className="loader">
        <div>
          <div className="spinner" />
          <div className="small muted" style={{ marginTop: 12 }}>
            Generating a puzzle…
          </div>
        </div>
      </div>
    );
  }

  const selectedValue = selected !== null ? state.board[selected] : 0;
  const remaining = state.board.filter((v) => v === 0).length;
  void tick;

  return (
    <div className="game-canvas-wrap" style={{ flexDirection: 'column', gap: 12, padding: 10 }}>
      <GameHud
        items={[
          { label: 'Time', value: formatClock(elapsed) },
          { label: 'Empty', value: remaining },
          { label: 'Mistakes', value: state.mistakes },
          { label: 'Hints', value: state.hints },
        ]}
        extra={
          <div className="row" style={{ gap: 8 }}>
            <button
              className={`btn btn-sm${noteMode ? ' btn-primary' : ''}`}
              onClick={() => setNoteMode((v) => !v)}
              aria-pressed={noteMode}
            >
              ✏️ Notes
            </button>
            <button className="btn btn-sm" onClick={useHint} disabled={selected === null}>
              💡 Hint
            </button>
            <select
              className="select"
              style={{ width: 'auto' }}
              value={shell.difficulty}
              aria-label="Difficulty"
              onChange={(e) => {
                const value = e.target.value as 'easy' | 'normal' | 'hard';
                shell.setDifficulty(value);
                stopTimer();
                elapsedBaseRef.current = 0;
                startedRef.current = false;
                finishedRef.current = false;
                setRestored(false);
                setState(buildPuzzle(value));
                void clearProgress(GAME_ID);
              }}
            >
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        }
      />

      {restored && (
        <div className="notice notice-info" style={{ width: 'min(100%, 470px)' }}>
          Continued your saved puzzle. Restart in the toolbar generates a new one.
        </div>
      )}

      <div
        role="grid"
        aria-label="Sudoku grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          width: 'min(100%, 470px)',
          aspectRatio: '1',
          border: '2px solid var(--text)',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        {state.board.map((value, i) => {
          const isGiven = state.givens[i];
          const isSelected = selected === i;
          const sameValue = value !== 0 && value === selectedValue;
          const related =
            selected !== null &&
            (rowOf(i) === rowOf(selected) ||
              colOf(i) === colOf(selected) ||
              boxOf(i) === boxOf(selected));
          const conflict = conflicts.has(i);
          const notes = state.notes[i];

          return (
            <button
              key={i}
              role="gridcell"
              aria-label={`Row ${rowOf(i) + 1}, column ${colOf(i) + 1}${value ? `, ${value}` : ', empty'}`}
              aria-selected={isSelected}
              onClick={() => setSelected(i)}
              style={{
                aspectRatio: '1',
                display: 'grid',
                placeItems: 'center',
                position: 'relative',
                borderRight: `${colOf(i) % 3 === 2 && colOf(i) !== 8 ? 2 : 1}px solid ${
                  colOf(i) % 3 === 2 ? 'var(--text)' : 'var(--border)'
                }`,
                borderBottom: `${rowOf(i) % 3 === 2 && rowOf(i) !== 8 ? 2 : 1}px solid ${
                  rowOf(i) % 3 === 2 ? 'var(--text)' : 'var(--border)'
                }`,
                background: conflict
                  ? 'var(--danger-soft)'
                  : isSelected
                    ? 'var(--brand-soft)'
                    : sameValue
                      ? 'color-mix(in srgb, var(--brand) 12%, transparent)'
                      : related
                        ? 'var(--surface-2)'
                        : 'var(--surface)',
                color: conflict ? 'var(--danger)' : isGiven ? 'var(--text)' : 'var(--brand)',
                fontWeight: isGiven ? 700 : 550,
                fontSize: 'clamp(0.85rem, 4.2vw, 1.4rem)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value !== 0 ? (
                value
              ) : notes.length ? (
                <span
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    fontSize: '0.42em',
                    color: 'var(--text-faint)',
                    lineHeight: 1.05,
                    width: '100%',
                    height: '100%',
                    padding: 1,
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <span key={n}>{notes.includes(n) ? n : ''}</span>
                  ))}
                </span>
              ) : (
                ''
              )}
            </button>
          );
        })}
      </div>

      <div className="row wrap" style={{ justifyContent: 'center', gap: 6, maxWidth: 470 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const used = state.board.filter((v) => v === n).length;
          return (
            <button
              key={n}
              className="btn"
              onClick={() => applyValue(n)}
              disabled={selected === null}
              style={{
                minWidth: 42,
                padding: '10px 0',
                fontSize: '1.05rem',
                opacity: used >= 9 ? 0.45 : 1,
              }}
              aria-label={`Enter ${n}`}
            >
              {n}
            </button>
          );
        })}
        <button
          className="btn"
          onClick={() => applyValue(0)}
          disabled={selected === null}
          style={{ minWidth: 52, padding: '10px 0' }}
          aria-label="Clear cell"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
