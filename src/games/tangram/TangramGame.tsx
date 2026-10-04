import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { formatClock } from '@/utils/format';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions } from '../_shared/puzzle/PuzzleUI';
import { LevelPicker } from '../_shared/puzzle/LevelPicker';
import { solvedInPack, usePackLevels } from '../_shared/puzzle/levels';
import { useStopwatch } from '../_shared/puzzle/useStopwatch';
import { LEVELS_PER_PACK, PIECES, findSlot, levelPuzzle, puzzleBounds, transform } from './engine';
import type { Placement, Puzzle, Vec } from './engine';
import './tangram.css';

const ID = 'tangram';
const PACK_NAMES = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
const TOLERANCE = { easy: 0.8, normal: 0.6, hard: 0.45 };
const noSave = (_: unknown): _ is never => false;

/** Starting spots in the tray below the silhouette. */
function trayPlacements(top: number): Placement[] {
  const row1 = top + 2.2;
  const row2 = top + 5;
  return [
    { x: -4.6, y: row1, rot: 0, flip: false },
    { x: 0, y: row1, rot: 0, flip: false },
    { x: 4.4, y: row1 - 0.2, rot: 0, flip: false },
    { x: -5.6, y: row2, rot: 0, flip: false },
    { x: -2.8, y: row2, rot: 0, flip: false },
    { x: 0.6, y: row2 + 0.4, rot: 0, flip: false },
    { x: 4.4, y: row2 + 0.4, rot: 0, flip: false },
  ];
}

const pointsAttr = (pts: Vec[]) => pts.map((p) => p.join(',')).join(' ');

export default function TangramGame() {
  const shell = useGameShell();
  const pack = shell.difficulty;
  const levels = usePackLevels(ID, pack, LEVELS_PER_PACK, noSave, shell.requestRestart, {
    packNames: PACK_NAMES,
  });
  const [puzzle, setPuzzle] = useState<Puzzle>(() => levelPuzzle(pack, 0));
  const bounds = useMemo(() => puzzleBounds(puzzle), [puzzle]);
  // The silhouette is centred on the origin; the tray sits underneath it.
  const view = useMemo(() => {
    const halfW = Math.max(8, (bounds.maxX - bounds.minX) / 2 + 1);
    const top = bounds.minY - 1;
    const trayTop = bounds.maxY + 0.6;
    return { x: -halfW, y: top, w: halfW * 2, h: trayTop - top + 7, trayTop };
  }, [bounds]);
  const [places, setPlaces] = useState<Placement[]>(() => trayPlacements(view.trayTop));
  const [snapped, setSnapped] = useState<Map<number, number>>(new Map()); // piece → slot
  const [selected, setSelected] = useState<number>(-1);
  const [hints, setHints] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const { elapsed, read, reset } = useStopwatch(started && !done && !shell.paused);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ i: number; dx: number; dy: number; sx: number; sy: number; moved: boolean; wasSelected: boolean } | null>(null);
  const locked = shell.paused || done || !levels.ready;

  const load = useCallback(
    (index: number) => {
      const p = levelPuzzle(pack, index);
      const b = puzzleBounds(p);
      setPuzzle(p);
      setPlaces(trayPlacements(b.maxY + 0.6));
      setSnapped(new Map());
      setSelected(-1);
      setHints(0);
      setStarted(false);
      setDone(false);
      reset(0);
    },
    [pack, reset],
  );

  useEffect(() => {
    if (levels.ready) load(levels.indexRef.current);
  }, [levels.ready, levels.indexRef, load]);
  const restart = useCallback(() => load(levels.indexRef.current), [levels.indexRef, load]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const ensureStarted = () => {
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
  };

  const finishIfSolved = useCallback(
    (next: Map<number, number>, hintCount: number) => {
      if (next.size < PIECES.length) return;
      setDone(true);
      setSelected(-1);
      const ms = read();
      const index = levels.indexRef.current;
      levels.recordSolve(levels.key, hintCount);
      shell.play('levelComplete');
      void reportProgress('tangram.first', 1);
      void incrementProgress('tangram.ten');
      if (hintCount === 0 && pack !== 'easy') void reportProgress('tangram.no-hints', 1);
      if (pack === 'hard') void reportProgress('tangram.hard', 1);
      if (solvedInPack({ ...levels.progress.solved, [levels.key]: hintCount }, pack) === LEVELS_PER_PACK)
        void reportProgress('tangram.pack', 1);
      shell.endRound({
        won: true,
        score: Math.max(100, 700 - Math.round(ms / 1000) * 2 - hintCount * 120),
        timeMs: ms,
        title: 'Shape complete!',
        details: [
          { label: 'Figure', value: `${PACK_NAMES[pack]} ${index + 1}` },
          { label: 'Pieces placed for you', value: String(hintCount) },
        ],
        next: index < LEVELS_PER_PACK - 1 ? { label: 'Next figure →', action: () => levels.select(index + 1) } : undefined,
      });
    },
    [levels, pack, read, shell],
  );

  /** Tries to drop piece i where it is: snap into a free matching slot if close. */
  const settle = (i: number, place: Placement, current: Map<number, number>) => {
    const taken = new Set([...current].filter(([p]) => p !== i).map(([, s]) => s));
    const slot = findSlot(puzzle, i, place, taken, [0, 0], TOLERANCE[pack]);
    const next = new Map(current);
    next.delete(i);
    let finalPlace = place;
    if (slot >= 0) {
      const target = puzzle.solution[slot];
      // Keep the piece's own rotation (it may differ by a symmetry) but move it exactly home.
      const mine = transform(PIECES[i], place);
      const theirs = transform(PIECES[slot], target);
      const cx = (pts: Vec[]) => pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const cy = (pts: Vec[]) => pts.reduce((s, p) => s + p[1], 0) / pts.length;
      finalPlace = { ...place, x: place.x + cx(theirs) - cx(mine), y: place.y + cy(theirs) - cy(mine) };
      next.set(i, slot);
      shell.play('pop');
    }
    setPlaces((ps) => ps.map((p, k) => (k === i ? finalPlace : p)));
    setSnapped(next);
    finishIfSolved(next, hints);
  };

  const toSvg = (e: { clientX: number; clientY: number }): Vec => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    const p = m ? pt.matrixTransform(m.inverse()) : pt;
    return [p.x, p.y];
  };

  const onPieceDown = (i: number, e: ReactPointerEvent<SVGPolygonElement>) => {
    if (locked) return;
    e.stopPropagation();
    (e.currentTarget.ownerSVGElement ?? e.currentTarget).setPointerCapture?.(e.pointerId);
    const [x, y] = toSvg(e);
    drag.current = { i, dx: x - places[i].x, dy: y - places[i].y, sx: x, sy: y, moved: false, wasSelected: selected === i };
    setSelected(i);
    ensureStarted();
  };

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = toSvg(e);
    if (!d.moved && Math.hypot(x - d.sx, y - d.sy) < 0.15) return;
    d.moved = true;
    setPlaces((ps) => ps.map((p, k) => (k === d.i ? { ...p, x: x - d.dx, y: y - d.dy } : p)));
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      // Tapping an already-selected piece turns it.
      if (d.wasSelected) rotate(d.i, 1);
      return;
    }
    settle(d.i, places[d.i], snapped);
  };

  const rotate = (i: number, by: number) => {
    if (locked || i < 0) return;
    ensureStarted();
    const place = { ...places[i], rot: (places[i].rot + by + 8) % 8 };
    shell.play('click');
    settle(i, place, snapped);
  };

  const flip = (i: number) => {
    if (locked || i < 0 || PIECES[i].kind !== 'P') return;
    ensureStarted();
    settle(i, { ...places[i], flip: !places[i].flip }, snapped);
  };

  const hint = () => {
    if (locked) return;
    const free = PIECES.map((_, i) => i).filter((i) => !snapped.has(i));
    if (!free.length) return;
    ensureStarted();
    const i = free[0];
    const taken = new Set(snapped.values());
    const slot = PIECES.findIndex((d, s) => d.kind === PIECES[i].kind && !taken.has(s));
    const next = new Map(snapped);
    next.set(i, slot);
    setPlaces((ps) => ps.map((p, k) => (k === i ? { ...puzzle.solution[slot] } : p)));
    setSnapped(next);
    setHints(hints + 1);
    finishIfSolved(next, hints + 1);
  };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (locked) return;
    const k = e.key;
    if (k === 'n' || k === 'N') {
      e.preventDefault();
      setSelected((selected + 1) % PIECES.length);
      return;
    }
    if (selected < 0) return;
    const step = e.shiftKey ? 1 : 0.25;
    const moves: Record<string, Vec> = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
    if (k in moves) {
      e.preventDefault();
      ensureStarted();
      const [dx, dy] = moves[k];
      const place = { ...places[selected], x: places[selected].x + dx, y: places[selected].y + dy };
      settle(selected, place, snapped);
    } else if (k === 'q' || k === 'Q') {
      e.preventDefault();
      rotate(selected, -1);
    } else if (k === 'e' || k === 'E') {
      e.preventDefault();
      rotate(selected, 1);
    } else if (k === 'f' || k === 'F') {
      // F is the shell's fullscreen key; only claim it for the parallelogram.
      if (PIECES[selected].kind === 'P') {
        e.preventDefault();
        e.stopPropagation();
        flip(selected);
      }
    }
  };

  const target = PIECES.map((def, i) => transform(def, puzzle.solution[i]));
  const index = levels.index;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Placed', value: `${snapped.size}/7` },
          { label: 'Time', value: formatClock(elapsed) },
          { label: 'Figure', value: `${index + 1}/${LEVELS_PER_PACK}` },
        ]}
      />
      <LevelPicker
        pack={pack}
        count={LEVELS_PER_PACK}
        index={index}
        solved={levels.progress.solved}
        onPick={levels.select}
        formatBest={(h) => (h === 0 ? '★★★' : `${h} hint${h === 1 ? '' : 's'}`)}
        disabled={shell.paused || !levels.ready}
      />
      <StatusBar>
        {done
          ? 'Every piece fits!'
          : selected >= 0
            ? `Selected: ${PIECES[selected].name}. Tap it again or use ↻ to turn it${PIECES[selected].kind === 'P' ? ', ⇋ to flip it' : ''}.`
            : 'Drag the seven pieces to fill the dark shape. Tap a selected piece to turn it.'}
      </StatusBar>
      <svg
        ref={svgRef}
        className={`tg-board${done ? ' pz-win' : ''}`}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        style={{ aspectRatio: `${view.w} / ${view.h}` }}
        tabIndex={0}
        role="application"
        aria-label={`Tangram figure. ${snapped.size} of 7 pieces placed. Press N to select a piece, arrow keys to move it, Q and E to turn it, F to flip the parallelogram.`}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKeyDown}
      >
        <rect x={view.x} y={view.trayTop} width={view.w} height={view.h} className="tg-tray" />
        {target.map((pts, i) => (
          <polygon key={`t${i}`} points={pointsAttr(pts)} className="tg-target" />
        ))}
        {pack === 'easy' &&
          target.map((pts, i) => <polygon key={`o${i}`} points={pointsAttr(pts)} className="tg-outline" />)}
        {PIECES.map((def, i) => (i === selected ? null : <PieceShape key={def.id} i={i} place={places[i]} snapped={snapped.has(i)} selected={false} onDown={onPieceDown} />))}
        {selected >= 0 && <PieceShape i={selected} place={places[selected]} snapped={snapped.has(selected)} selected onDown={onPieceDown} />}
      </svg>
      <PuzzleActions>
        <button type="button" className="btn btn-sm" onClick={() => rotate(selected, -1)} disabled={locked || selected < 0} aria-label="Turn anticlockwise">
          ↺
        </button>
        <button type="button" className="btn btn-sm" onClick={() => rotate(selected, 1)} disabled={locked || selected < 0} aria-label="Turn clockwise">
          ↻
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => flip(selected)}
          disabled={locked || selected < 0 || PIECES[selected].kind !== 'P'}
          aria-label="Flip the parallelogram"
        >
          ⇋ Flip
        </button>
        <button type="button" className="btn btn-sm" onClick={hint} disabled={locked}>
          💡 Place one
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}

function PieceShape({
  i,
  place,
  snapped,
  selected,
  onDown,
}: {
  i: number;
  place: Placement;
  snapped: boolean;
  selected: boolean;
  onDown: (i: number, e: ReactPointerEvent<SVGPolygonElement>) => void;
}) {
  const def = PIECES[i];
  return (
    <polygon
      points={pointsAttr(transform(def, place))}
      fill={def.color}
      className={`tg-piece${snapped ? ' snapped' : ''}${selected ? ' selected' : ''}`}
      onPointerDown={(e) => onDown(i, e)}
    />
  );
}
