import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { InputManager } from '@/game-engine/InputManager';
import type { Direction } from '@/game-engine/InputManager';
import { reportProgress } from '@/achievements/AchievementService';
import { clearProgress, loadProgress, saveProgress } from '@/storage/StorageService';
import {
  SIZE_BY_DIFFICULTY,
  TARGET_BY_DIFFICULTY,
  canMove,
  cloneGrid,
  hasReached,
  highestTile,
  move,
  newGame,
  spawnTile,
} from './engine';
import type { Grid } from './engine';

const GAME_ID = 'number-merge-2048';
const UNDOS = { easy: 5, normal: 3, hard: 0 } as const;

const TILE_STYLE: Record<number, { bg: string; fg: string }> = {
  0: { bg: 'rgba(255,255,255,0.05)', fg: 'transparent' },
  2: { bg: '#eee4da', fg: '#6b6357' },
  4: { bg: '#ede0c8', fg: '#6b6357' },
  8: { bg: '#f2b179', fg: '#fff' },
  16: { bg: '#f59563', fg: '#fff' },
  32: { bg: '#f67c5f', fg: '#fff' },
  64: { bg: '#f65e3b', fg: '#fff' },
  128: { bg: '#edcf72', fg: '#fff' },
  256: { bg: '#edcc61', fg: '#fff' },
  512: { bg: '#edc850', fg: '#fff' },
  1024: { bg: '#edc53f', fg: '#fff' },
  2048: { bg: '#edc22e', fg: '#fff' },
  4096: { bg: '#8b5cf6', fg: '#fff' },
};

function tileStyle(value: number) {
  return TILE_STYLE[value] ?? { bg: '#6d28d9', fg: '#fff' };
}

interface SavedState {
  grid: Grid;
  score: number;
  undosLeft: number;
  usedUndo: boolean;
  difficulty: string;
}

export default function NumberMergeGame() {
  const shell = useGameShell();
  const size = SIZE_BY_DIFFICULTY[shell.difficulty];
  const target = TARGET_BY_DIFFICULTY[shell.difficulty];

  const [grid, setGrid] = useState<Grid>(() => newGame(size));
  const [score, setScore] = useState(0);
  const [undosLeft, setUndosLeft] = useState<number>(UNDOS[shell.difficulty]);
  const [usedUndo, setUsedUndo] = useState(false);
  const [reachedTarget, setReachedTarget] = useState(false);
  const [restored, setRestored] = useState(false);
  const [loading, setLoading] = useState(true);

  const historyRef = useRef<{ grid: Grid; score: number }[]>([]);
  const startedRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    shell.setCapabilities({ pausable: false });
  }, [shell]);

  // Restore an interrupted run so "Continue Playing" works.
  useEffect(() => {
    let alive = true;
    void loadProgress<SavedState>(GAME_ID).then((saved) => {
      if (!alive) return;
      if (saved && saved.difficulty === shell.difficulty && Array.isArray(saved.grid)) {
        setGrid(saved.grid);
        setScore(saved.score);
        setUndosLeft(saved.undosLeft);
        setUsedUndo(saved.usedUndo);
        setRestored(true);
        startedRef.current = true;
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(
    (nextGrid: Grid, nextScore: number, nextUndos: number, undoUsed: boolean) => {
      const best = highestTile(nextGrid);
      void saveProgress(
        GAME_ID,
        {
          grid: nextGrid,
          score: nextScore,
          undosLeft: nextUndos,
          usedUndo: undoUsed,
          difficulty: shell.difficulty,
        } satisfies SavedState,
        { label: `Score ${nextScore} · best tile ${best}`, percent: (best / target) * 100 },
      );
    },
    [shell.difficulty, target],
  );

  const restart = useCallback(() => {
    const fresh = newGame(SIZE_BY_DIFFICULTY[shell.difficulty]);
    historyRef.current = [];
    finishedRef.current = false;
    setGrid(fresh);
    setScore(0);
    setUndosLeft(UNDOS[shell.difficulty]);
    setUsedUndo(false);
    setReachedTarget(false);
    setRestored(false);
    startedRef.current = false;
    void clearProgress(GAME_ID);
  }, [shell.difficulty]);

  useEffect(() => {
    shell.registerRestart(restart);
  }, [shell, restart]);

  const finish = useCallback(
    (finalGrid: Grid, finalScore: number, won: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const best = highestTile(finalGrid);
      void reportProgress('merge.tile-128', best);
      void reportProgress('merge.tile-512', best);
      void reportProgress('merge.tile-1024', best);
      void reportProgress('merge.tile-2048', best);
      void reportProgress('merge.score-10000', finalScore);
      if (!usedUndo && best >= 512) void reportProgress('merge.no-undo', 1);
      void clearProgress(GAME_ID);
      shell.endRound({
        score: finalScore,
        won,
        lost: !won,
        title: won ? 'Target reached!' : 'No moves left',
        details: [
          { label: 'Best tile', value: String(best) },
          { label: 'Board', value: `${size}x${size}` },
        ],
      });
    },
    [shell, size, usedUndo],
  );

  const doMove = useCallback(
    (dir: Direction) => {
      if (finishedRef.current) return;
      const result = move(grid, dir);
      if (!result.moved) return;

      if (!startedRef.current) {
        startedRef.current = true;
        shell.startRound();
      }

      historyRef.current.push({ grid: cloneGrid(grid), score });
      if (historyRef.current.length > 12) historyRef.current.shift();

      const next = result.grid;
      spawnTile(next);
      const nextScore = score + result.gained;
      setGrid(next);
      setScore(nextScore);
      setRestored(false);

      if (result.merged > 0) {
        shell.play('pop');
        shell.vibrate(15);
      } else {
        shell.play('click');
      }

      persist(next, nextScore, undosLeft, usedUndo);

      if (!reachedTarget && hasReached(next, target)) {
        setReachedTarget(true);
        shell.play('levelComplete');
        finish(next, nextScore + 1000, true);
        return;
      }
      if (!canMove(next)) finish(next, nextScore, false);
    },
    [finish, grid, persist, reachedTarget, score, shell, target, undosLeft, usedUndo],
  );

  const undo = useCallback(() => {
    if (undosLeft <= 0 || finishedRef.current) return;
    const previous = historyRef.current.pop();
    if (!previous) return;
    setGrid(previous.grid);
    setScore(previous.score);
    setUndosLeft((n) => n - 1);
    setUsedUndo(true);
    shell.play('whoosh');
    persist(previous.grid, previous.score, undosLeft - 1, true);
  }, [persist, shell, undosLeft]);

  useEffect(() => {
    const input = new InputManager({
      target: boardRef.current,
      onDirection: doMove,
      onSwipe: doMove,
      onKeyDown: (key) => {
        if (key === 'u' || key === 'U') undo();
      },
    });
    return () => input.dispose();
  }, [doMove, undo]);

  if (loading)
    return (
      <div className="loader">
        <div className="spinner" />
      </div>
    );

  return (
    <div className="game-canvas-wrap" style={{ flexDirection: 'column', gap: 12, padding: 10 }}>
      <GameHud
        items={[
          { label: 'Score', value: score },
          { label: 'Best', value: shell.personalBest ?? '—' },
          { label: 'Target', value: target },
          { label: 'Best tile', value: highestTile(grid) },
        ]}
        extra={
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-sm" onClick={undo} disabled={undosLeft <= 0}>
              ↶ Undo ({undosLeft})
            </button>
            <select
              className="select"
              style={{ width: 'auto' }}
              value={shell.difficulty}
              aria-label="Difficulty"
              onChange={(e) => {
                shell.setDifficulty(e.target.value as 'easy' | 'normal' | 'hard');
                void clearProgress(GAME_ID);
              }}
            >
              <option value="easy">Easy (5x5)</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        }
      />

      {restored && (
        <div className="notice notice-info" style={{ width: 'min(100%, 460px)' }}>
          Continued your saved game. Use Restart in the toolbar for a new one.
        </div>
      )}

      <div
        ref={boardRef}
        role="grid"
        aria-label="Number merge board"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap: 'clamp(4px, 1.4vw, 10px)',
          padding: 'clamp(5px, 1.6vw, 11px)',
          borderRadius: 14,
          background: 'rgba(120,110,100,0.25)',
          width: 'min(100%, 460px)',
          aspectRatio: '1',
          touchAction: 'none',
        }}
      >
        {grid.flat().map((value, i) => {
          const style = tileStyle(value);
          const digits = String(value).length;
          return (
            <div
              key={i}
              role="gridcell"
              aria-label={value ? `${value}` : 'empty'}
              style={{
                borderRadius: 8,
                background: style.bg,
                color: style.fg,
                display: 'grid',
                placeItems: 'center',
                fontWeight: 750,
                fontSize: `clamp(0.8rem, ${Math.max(3.2, 9 - digits * 1.1)}vw, ${Math.max(1, 2.4 - digits * 0.22)}rem)`,
                transition: 'background 110ms ease',
                aspectRatio: '1',
              }}
            >
              {value || ''}
            </div>
          );
        })}
      </div>

      <p className="small muted" style={{ textAlign: 'center' }}>
        Arrow keys, WASD or swipe to slide. Press U to undo. Your run saves automatically.
      </p>
    </div>
  );
}
