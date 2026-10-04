import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions } from '../_shared/puzzle/PuzzleUI';
import { LevelPicker } from '../_shared/puzzle/LevelPicker';
import { solvedInPack, usePackLevels } from '../_shared/puzzle/levels';
import { EXIT_ROW, SIZE, isSolved, parse, slide, slideRange, solve, validPieces } from './engine';
import type { Piece } from './engine';
import { LEVEL_PACKS } from './levels';
import './unblock.css';

const ID = 'unblock-puzzle';
const PACK_NAMES = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
const WOOD = ['#c08457', '#a16207', '#b45309', '#92400e', '#ca8a04', '#9a6b3f', '#b7791f', '#8b5a2b'];

interface InProgress {
  pieces: Piece[];
  moves: number;
  last: number;
  hints: number;
}

function validProgress(v: unknown): v is InProgress {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    validPieces(s.pieces) &&
    Number.isInteger(s.moves) &&
    Number.isInteger(s.last) &&
    Number.isInteger(s.hints) &&
    (s.moves as number) >= 0
  );
}

export function starsFor(moves: number, best: number): number {
  return moves <= best ? 3 : moves <= Math.ceil(best * 1.5) ? 2 : 1;
}

export default function UnblockGame() {
  const shell = useGameShell();
  const pack = shell.difficulty;
  const levelsList = LEVEL_PACKS[pack];
  const levels = usePackLevels(ID, pack, levelsList.length, validProgress, shell.requestRestart, {
    packNames: PACK_NAMES,
  });
  const [pieces, setPieces] = useState<Piece[]>(() => parse(levelsList[0].level));
  const [history, setHistory] = useState<{ pieces: Piece[]; moves: number; last: number }[]>([]);
  const [moves, setMoves] = useState(0);
  const [hints, setHints] = useState(0);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [drag, setDrag] = useState<{ k: number; offset: number } | null>(null);
  const [done, setDone] = useState(false);
  const [exiting, setExiting] = useState(false);
  const lastPiece = useRef(-1);
  const startedRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ k: number; x: number; y: number; range: [number, number] } | null>(null);
  const finishTimer = useRef<number | undefined>();

  const best = levelsList[levels.index]?.moves ?? 0;

  const load = useCallback(
    (index: number) => {
      window.clearTimeout(finishTimer.current);
      const saved = levels.savedFor(index);
      setPieces(saved ? saved.pieces : parse(levelsList[index].level));
      setMoves(saved ? saved.moves : 0);
      setHints(saved ? saved.hints : 0);
      lastPiece.current = saved ? saved.last : -1;
      setHistory([]);
      setHint(null);
      setDrag(null);
      setDone(false);
      setExiting(false);
      startedRef.current = false;
    },
    [levels, levelsList],
  );

  useEffect(() => {
    if (levels.ready) load(levels.indexRef.current);
    // Only when progress first becomes available or the pack changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels.ready, pack]);

  const restart = useCallback(() => {
    // Play Again / Restart start the level afresh rather than resuming.
    levels.clearCurrent();
    window.clearTimeout(finishTimer.current);
    setPieces(parse(levelsList[levels.indexRef.current].level));
    setMoves(0);
    setHints(0);
    lastPiece.current = -1;
    setHistory([]);
    setHint(null);
    setDone(false);
    setExiting(false);
    startedRef.current = false;
  }, [levels, levelsList]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => () => window.clearTimeout(finishTimer.current), []);

  const finish = useCallback(
    (moveCount: number, hintCount: number) => {
      setDone(true);
      setExiting(true);
      const index = levels.indexRef.current;
      const key = levels.key;
      finishTimer.current = window.setTimeout(() => {
        levels.recordSolve(key, moveCount);
        const s = starsFor(moveCount, best);
        void reportProgress('unblock-puzzle.first', 1);
        void incrementProgress('unblock-puzzle.twenty');
        if (s === 3) void reportProgress('unblock-puzzle.perfect', 1);
        if (pack === 'hard' && hintCount === 0) void reportProgress('unblock-puzzle.hard', 1);
        if (solvedInPack({ ...levels.progress.solved, [key]: moveCount }, pack) === levelsList.length)
          void reportProgress('unblock-puzzle.pack', 1);
        shell.endRound({
          won: true,
          score: Math.max(50, best * 60 - Math.max(0, moveCount - best) * 25 - hintCount * 80),
          title: `Unblocked! ${'★'.repeat(s)}${'☆'.repeat(3 - s)}`,
          details: [
            { label: 'Level', value: `${PACK_NAMES[pack]} ${index + 1}` },
            { label: 'Moves', value: `${moveCount} (best ${best})` },
            { label: 'Hints', value: String(hintCount) },
          ],
          next:
            index < levelsList.length - 1
              ? { label: 'Next level →', action: () => levels.select(index + 1) }
              : undefined,
        });
      }, 420);
    },
    [best, levels, levelsList.length, pack, shell],
  );

  const commit = useCallback(
    (k: number, by: number) => {
      const next = slide(pieces, k, by);
      if (!next) return;
      if (!startedRef.current) {
        startedRef.current = true;
        shell.startRound();
      }
      // Sliding the same block again continues the same move.
      const count = k === lastPiece.current ? moves : moves + 1;
      setHistory([...history, { pieces, moves, last: lastPiece.current }]);
      lastPiece.current = k;
      setPieces(next);
      setMoves(count);
      setHint(null);
      shell.play('click');
      if (isSolved(next)) {
        shell.play('whoosh');
        finish(count, hints);
      } else {
        levels.saveCurrent(levels.key, { pieces: next, moves: count, last: k, hints });
      }
    },
    [finish, hints, history, levels, moves, pieces, shell],
  );

  const locked = shell.paused || done || !levels.ready;

  const onPointerDown = (k: number, e: ReactPointerEvent<HTMLButtonElement>) => {
    if (locked || e.button > 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragStart.current = { k, x: e.clientX, y: e.clientY, range: slideRange(pieces, k) };
    setDrag({ k, offset: 0 });
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragStart.current;
    const board = boardRef.current;
    if (!d || !board) return;
    const cell = board.getBoundingClientRect().width / SIZE;
    const delta = pieces[d.k].horizontal ? e.clientX - d.x : e.clientY - d.y;
    const offset = Math.max(d.range[0], Math.min(d.range[1], delta / cell));
    setDrag({ k: d.k, offset });
  };

  const onPointerUp = () => {
    const d = dragStart.current;
    dragStart.current = null;
    if (!d || !drag) return setDrag(null);
    const by = Math.round(drag.offset);
    setDrag(null);
    if (by) commit(d.k, by);
  };

  const onKey = (k: number, e: KeyboardEvent) => {
    if (locked) return;
    const p = pieces[k];
    const dir =
      p.horizontal && e.key === 'ArrowLeft' ? -1 : p.horizontal && e.key === 'ArrowRight' ? 1 :
      !p.horizontal && e.key === 'ArrowUp' ? -1 : !p.horizontal && e.key === 'ArrowDown' ? 1 : 0;
    if (!dir) return;
    e.preventDefault();
    commit(k, dir);
  };

  const undo = () => {
    if (locked || !history.length) return;
    const prev = history[history.length - 1];
    setPieces(prev.pieces);
    setMoves(prev.moves);
    lastPiece.current = prev.last;
    setHistory(history.slice(0, -1));
    setHint(null);
  };

  const showHint = () => {
    if (locked) return;
    const plan = solve(pieces);
    if (!plan?.length) return;
    setHint(plan[0]);
    setHints(hints + 1);
  };

  const index = levels.index;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Level', value: `${index + 1}/${levelsList.length}` },
          { label: 'Moves', value: moves },
          { label: 'Best possible', value: best },
        ]}
      />
      <LevelPicker
        pack={pack}
        count={levelsList.length}
        index={index}
        solved={levels.progress.solved}
        onPick={levels.select}
        formatBest={(m) => `${m} moves`}
        disabled={shell.paused || !levels.ready}
      />
      <StatusBar>
        {done
          ? 'The red block is free!'
          : hint
            ? `Hint: slide the highlighted block ${pieces[hint[0]].horizontal ? (hint[1] > 0 ? 'right' : 'left') : hint[1] > 0 ? 'down' : 'up'} ${Math.abs(hint[1])} square${Math.abs(hint[1]) === 1 ? '' : 's'}.`
            : 'Slide the blocks along their length to clear a path for the red block.'}
      </StatusBar>
      <div className="ub-frame">
        <div className="ub-board" ref={boardRef} role="group" aria-label="Sliding block board. Tab to a block and use the arrow keys to slide it.">
          {pieces.map((p, k) => {
            const offset = drag?.k === k ? drag.offset : 0;
            const x = (p.horizontal ? p.col + offset : p.col) + (k === 0 && exiting ? 3 : 0);
            const y = p.horizontal ? p.row : p.row + offset;
            return (
              <button
                key={k}
                type="button"
                className={`ub-block${k === 0 ? ' key' : ''}${drag?.k === k ? ' dragging' : ''}${hint?.[0] === k ? ' hint' : ''}`}
                style={{
                  left: `${(x / SIZE) * 100}%`,
                  top: `${(y / SIZE) * 100}%`,
                  width: `${((p.horizontal ? p.len : 1) / SIZE) * 100}%`,
                  height: `${((p.horizontal ? 1 : p.len) / SIZE) * 100}%`,
                  ['--wood' as string]: k === 0 ? '#dc2626' : WOOD[k % WOOD.length],
                }}
                onPointerDown={(e) => onPointerDown(k, e)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={(e) => onKey(k, e)}
                disabled={locked}
                aria-label={`${k === 0 ? 'Red key block' : 'Block'}, ${p.horizontal ? 'horizontal' : 'vertical'}, length ${p.len}, row ${p.row + 1}, column ${p.col + 1}. Arrow keys slide it ${p.horizontal ? 'left and right' : 'up and down'}.`}
              >
                <span>{k === 0 ? '➜' : ''}</span>
              </button>
            );
          })}
        </div>
        <div className="ub-exit" style={{ top: `${(EXIT_ROW / SIZE) * 100}%` }} aria-hidden="true" />
      </div>
      <PuzzleActions>
        <button type="button" className="btn btn-sm" onClick={undo} disabled={locked || !history.length}>
          ↶ Undo
        </button>
        <button type="button" className="btn btn-sm" onClick={showHint} disabled={locked}>
          💡 Hint
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
