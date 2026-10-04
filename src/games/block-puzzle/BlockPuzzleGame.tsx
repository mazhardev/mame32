'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { formatNumber } from '@/utils/format';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { useDirectionKeys } from '../_shared/puzzle/useDirectionKeys';
import { BOARD, dealTray, fits, isGameOver, place, shapeById, validSave } from './engine';
import type { Shape } from './engine';
import './blocks.css';

const ID = 'block-puzzle';
const COLORS = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

interface Drag {
  slot: number;
  x: number;
  y: number;
  /** Where the press started, to tell a tap from a drag. */
  sx: number;
  sy: number;
  lift: number;
}

export default function BlockPuzzleGame() {
  const shell = useGameShell();
  const n = BOARD[shell.difficulty];
  const save = useSavedGame(ID, validSave);
  const [board, setBoard] = useState<number[]>(() => Array<number>(n * n).fill(-1));
  const [tray, setTray] = useState<(string | null)[]>(() => dealTray(shell.difficulty, Math.random));
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [cursor, setCursor] = useState<[number, number]>([0, 0]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [flash, setFlash] = useState<Set<number>>(new Set());
  const [over, setOver] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const bestCombo = useRef(0);
  const flashTimer = useRef<number | undefined>(undefined);
  const pending = save.saved && save.saved.n === n ? save.saved : null;
  const locked = shell.paused || over || !!pending || save.loading;

  const restart = useCallback(() => {
    setBoard(Array<number>(n * n).fill(-1));
    setTray(dealTray(shell.difficulty, Math.random));
    setScore(0);
    setLines(0);
    setStreak(0);
    setSelected(null);
    setDrag(null);
    setFlash(new Set());
    setOver(false);
    startedRef.current = false;
    bestCombo.current = 0;
    save.clear();
  }, [n, save, shell.difficulty]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const tryPlace = useCallback(
    (slot: number, row: number, col: number): boolean => {
      const id = tray[slot];
      if (locked || !id) return false;
      const s = shapeById(id)!;
      const res = place(board, n, s, row, col, streak);
      if (!res) {
        shell.play('failure');
        return false;
      }
      if (!startedRef.current) {
        startedRef.current = true;
        shell.startRound();
      }
      let nextTray = tray.slice();
      nextTray[slot] = null;
      if (nextTray.every((t) => !t)) nextTray = dealTray(shell.difficulty, Math.random);
      const nextScore = score + res.points;
      const nextLines = lines + res.lines;
      const nextStreak = res.lines ? streak + 1 : 0;
      setBoard(res.board);
      setTray(nextTray);
      setScore(nextScore);
      setLines(nextLines);
      setStreak(nextStreak);
      setSelected(null);
      if (res.lines) {
        setFlash(new Set(res.cleared));
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setFlash(new Set()), 320);
        shell.play(res.lines >= 2 ? 'powerup' : 'success');
        void reportProgress('block-puzzle.first-line', 1);
        void incrementProgress('block-puzzle.lines', res.lines);
        bestCombo.current = Math.max(bestCombo.current, res.lines);
        if (res.lines >= 3) void reportProgress('block-puzzle.combo', 1);
      } else shell.play('pop');
      void reportProgress('block-puzzle.score-1000', nextScore);
      void reportProgress('block-puzzle.score-5000', nextScore);
      if (isGameOver(res.board, n, nextTray)) {
        setOver(true);
        save.clear();
        shell.endRound({
          score: nextScore,
          title: 'No room left!',
          message: 'None of the pieces in the tray fits on the board.',
          details: [
            { label: 'Lines cleared', value: String(nextLines) },
            { label: 'Best combo', value: `${bestCombo.current} line${bestCombo.current === 1 ? '' : 's'}` },
          ],
        });
      } else {
        save.persist(
          { n, board: res.board, tray: nextTray, score: nextScore, lines: nextLines, streak: nextStreak },
          { label: `${formatNumber(nextScore)} points · ${nextLines} lines` },
        );
      }
      return true;
    },
    [board, lines, locked, n, save, score, shell, streak, tray],
  );

  /** Board cell under the dragged piece's top-left corner. */
  const anchorFor = useCallback(
    (d: Drag): [number, number] | null => {
      const el = boardRef.current;
      const id = tray[d.slot];
      if (!el || !id) return null;
      const s = shapeById(id)!;
      const rect = el.getBoundingClientRect();
      const cell = rect.width / n;
      const left = d.x - (s.cols * cell) / 2;
      const top = d.y - (s.rows * cell) / 2 - d.lift;
      return [Math.round((top - rect.top) / cell), Math.round((left - rect.left) / cell)];
    },
    [n, tray],
  );

  const onTrayDown = (slot: number, e: ReactPointerEvent<HTMLButtonElement>) => {
    if (locked || !tray[slot] || e.button > 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const cell = (boardRef.current?.getBoundingClientRect().width ?? 400) / n;
    // Lift the piece above a finger so it stays visible while dragging.
    setDrag({
      slot,
      x: e.clientX,
      y: e.clientY,
      sx: e.clientX,
      sy: e.clientY,
      lift: e.pointerType === 'touch' ? cell * 2 : 0,
    });
  };
  const onTrayMove = (e: ReactPointerEvent) => {
    if (drag) setDrag({ ...drag, x: e.clientX, y: e.clientY });
  };
  const onTrayUp = (slot: number, e: ReactPointerEvent) => {
    const d = drag;
    setDrag(null);
    if (!d) return;
    const moved = Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 10;
    const anchor = anchorFor({ ...d, x: e.clientX, y: e.clientY });
    const onBoard = anchor && anchor[0] > -3 && anchor[1] > -3 && anchor[0] < n + 2 && anchor[1] < n + 2;
    if (moved && anchor && onBoard && boardHit(e.clientX, e.clientY - d.lift)) tryPlace(d.slot, anchor[0], anchor[1]);
    else setSelected(selected === slot ? null : slot); // a tap selects for tap-to-place
  };

  const boardHit = (x: number, y: number) => {
    const r = boardRef.current?.getBoundingClientRect();
    return !!r && x >= r.left - 40 && x <= r.right + 40 && y >= r.top - 40 && y <= r.bottom + 40;
  };

  // Keyboard: 1–3 pick a piece, arrows move it, Enter places, Escape cancels.
  useDirectionKeys(
    (dir) => {
      if (selected === null) return;
      const [r, c] = cursor;
      const next: [number, number] =
        dir === 'up' ? [Math.max(0, r - 1), c] : dir === 'down' ? [Math.min(n - 1, r + 1), c] : dir === 'left' ? [r, Math.max(0, c - 1)] : [r, Math.min(n - 1, c + 1)];
      setCursor(next);
    },
    !locked,
    {
      '1': () => tray[0] && setSelected(0),
      '2': () => tray[1] && setSelected(1),
      '3': () => tray[2] && setSelected(2),
      Enter: () => selected !== null && tryPlace(selected, cursor[0], cursor[1]),
      Escape: () => setSelected(null),
    },
  );

  // Preview: where the dragged or selected piece would land.
  const preview = useMemo(() => {
    let slot: number | null = null;
    let anchor: [number, number] | null = null;
    if (drag) {
      slot = drag.slot;
      anchor = anchorFor(drag);
    } else if (selected !== null) {
      slot = selected;
      anchor = cursor;
    }
    if (slot === null || !anchor || !tray[slot]) return null;
    const s = shapeById(tray[slot]!)!;
    const ok = fits(board, n, s, anchor[0], anchor[1]);
    const cells = new Set(
      s.cells
        .map(([dy, dx]) => [anchor![0] + dy, anchor![1] + dx])
        .filter(([r, c]) => r >= 0 && c >= 0 && r < n && c < n)
        .map(([r, c]) => r * n + c),
    );
    const clears = ok ? new Set(place(board, n, s, anchor[0], anchor[1])!.cleared) : new Set<number>();
    return { cells, ok, clears, color: s.color };
  }, [anchorFor, board, cursor, drag, n, selected, tray]);

  const onCellClick = (i: number) => {
    if (selected === null || locked) return;
    const r = Math.floor(i / n);
    const c = i % n;
    setCursor([r, c]);
    tryPlace(selected, r, c);
  };

  const resume = () => {
    if (!pending) return;
    setBoard(pending.board);
    setTray(pending.tray);
    setScore(pending.score);
    setLines(pending.lines);
    setStreak(pending.streak);
    save.dismiss();
  };

  const draggedShape = drag && tray[drag.slot] ? shapeById(tray[drag.slot]!) : null;
  const cellPx = (boardRef.current?.getBoundingClientRect().width ?? 400) / n;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Score', value: formatNumber(score) },
          { label: 'Best', value: shell.personalBest !== null ? formatNumber(Math.max(shell.personalBest, score)) : '—' },
          { label: 'Lines', value: lines },
          { label: 'Streak', value: streak ? `×${streak}` : '—' },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`${formatNumber(pending.score)} points · ${pending.lines} lines`}
          onContinue={resume}
          onNew={restart}
        />
      )}
      <StatusBar>
        {over
          ? 'No room left for any piece.'
          : selected !== null
            ? 'Tap a square to place the piece there (its top-left corner), or use the arrow keys and Enter.'
            : 'Drag a piece onto the board. Fill a whole row or column to clear it.'}
      </StatusBar>
      <div ref={boardRef} className="bp-board" style={{ ['--n' as string]: n }} role="grid" aria-label={`Block board ${n} by ${n}`}>
        {board.map((v, i) => {
          const inPreview = preview?.cells.has(i);
          return (
            <div
              key={i}
              role="gridcell"
              className={`bp-cell${v >= 0 ? ' full' : ''}${flash.has(i) ? ' flash' : ''}${inPreview ? (preview!.ok ? ' ghost' : ' bad') : ''}${preview?.clears.has(i) ? ' will-clear' : ''}`}
              style={{
                ['--c' as string]: v >= 0 ? COLORS[v] : inPreview && preview!.ok ? COLORS[preview!.color] : undefined,
              }}
              onClick={() => onCellClick(i)}
            />
          );
        })}
      </div>
      <div className="bp-tray" role="group" aria-label="Pieces">
        {tray.map((id, slot) => (
          <button
            key={slot}
            type="button"
            className={`bp-slot${selected === slot ? ' sel' : ''}${drag?.slot === slot ? ' lifted' : ''}`}
            onPointerDown={(e) => onTrayDown(slot, e)}
            onPointerMove={onTrayMove}
            onPointerUp={(e) => onTrayUp(slot, e)}
            onPointerCancel={() => setDrag(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (id) setSelected(selected === slot ? null : slot);
              }
            }}
            disabled={locked || !id}
            aria-label={id ? `Piece ${slot + 1}: ${shapeById(id)!.cells.length} squares` : `Slot ${slot + 1} empty`}
            aria-pressed={selected === slot}
          >
            {id && <MiniShape shape={shapeById(id)!} />}
          </button>
        ))}
      </div>
      {drag && draggedShape && (
        <div
          className="bp-float"
          style={{
            left: drag.x - (draggedShape.cols * cellPx) / 2,
            top: drag.y - (draggedShape.rows * cellPx) / 2 - drag.lift,
            ['--cell' as string]: `${cellPx}px`,
          }}
          aria-hidden="true"
        >
          <MiniShape shape={draggedShape} />
        </div>
      )}
    </BoardLayout>
  );
}

function MiniShape({ shape }: { shape: Shape }) {
  const cells = new Set(shape.cells.map(([r, c]) => r * shape.cols + c));
  return (
    <span className="bp-mini" style={{ gridTemplateColumns: `repeat(${shape.cols}, var(--cell))` }}>
      {Array.from({ length: shape.rows * shape.cols }, (_, i) => (
        <span key={i} className={cells.has(i) ? 'on' : ''} style={{ ['--c' as string]: COLORS[shape.color] }} />
      ))}
    </span>
  );
}
