import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { formatClock } from '@/utils/format';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions, ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { useStopwatch } from '../_shared/puzzle/useStopwatch';
import { GRID, PICTURE, home, layoutFor, makeTabs, piecePath, scatter, scoreFor, trySnap } from './engine';
import type { Layout, PieceState } from './engine';
import { paintLandscape } from './picture';

const ID = 'jigsaw-puzzle';

interface JigsawSave {
  seed: string;
  kind: 'wide' | 'tall';
  cols: number;
  pieces: PieceState[];
  ms: number;
  hints: number;
}

function validSave(v: unknown): v is JigsawSave {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.seed === 'string' &&
    s.seed.length < 40 &&
    (s.kind === 'wide' || s.kind === 'tall') &&
    Number.isInteger(s.cols) &&
    Array.isArray(s.pieces) &&
    s.pieces.every(
      (p) => p && typeof p === 'object' && Number.isInteger(p.r) && Number.isInteger(p.c) && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.locked === 'boolean',
    ) &&
    typeof s.ms === 'number' &&
    Number.isInteger(s.hints)
  );
}

function newSeed() {
  return Math.random().toString(36).slice(2, 10);
}

export default function JigsawGame() {
  const shell = useGameShell();
  const { cols, rows } = GRID[shell.difficulty];
  const pw = PICTURE.w / cols;
  const ph = PICTURE.h / rows;
  const save = useSavedGame(ID, validSave);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layout] = useState<Layout>(() =>
    layoutFor(typeof window !== 'undefined' && window.innerWidth < 700 ? 'tall' : 'wide'),
  );
  const [seed, setSeed] = useState(newSeed);
  const [pieces, setPieces] = useState<PieceState[]>(() => scatter(layout, cols, rows, Math.random));
  const [ghost, setGhost] = useState(shell.difficulty === 'easy');
  const [hints, setHints] = useState(0);
  const [selected, setSelected] = useState(-1);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const { elapsed, read, reset } = useStopwatch(started && !done && !shell.paused);

  const piecesRef = useRef(pieces);
  piecesRef.current = pieces;
  const scaleRef = useRef(1);
  const art = useRef<{ picture: HTMLCanvasElement | null; bitmaps: Map<string, HTMLCanvasElement>; paths: Map<string, Path2D> }>({
    picture: null,
    bitmaps: new Map(),
    paths: new Map(),
  });
  const drag = useRef<{ index: number; dx: number; dy: number } | null>(null);
  const frame = useRef(0);
  const pending = save.saved && save.saved.cols === cols && save.saved.kind === layout.kind ? save.saved : null;
  const locked = shell.paused || done || !!pending || save.loading;
  const placed = pieces.filter((p) => p.locked).length;

  /* ------------------------------------------------------------- drawing */

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const { picture, bitmaps } = art.current;
    if (!canvas || !ctx || !picture) return;
    const s = scaleRef.current * (window.devicePixelRatio || 1);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.clearRect(0, 0, layout.w, layout.h);
    ctx.fillStyle = '#2a2233';
    ctx.fillRect(0, 0, layout.w, layout.h);
    // The board: a frame and, optionally, a faint copy of the picture.
    ctx.fillStyle = '#1b1622';
    ctx.fillRect(layout.px, layout.py, PICTURE.w, PICTURE.h);
    if (ghost) {
      ctx.globalAlpha = 0.22;
      ctx.drawImage(picture, layout.px, layout.py, PICTURE.w, PICTURE.h);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(layout.px - 1, layout.py - 1, PICTURE.w + 2, PICTURE.h + 2);
    const pad = Math.min(pw, ph) * 0.3;
    const list = piecesRef.current;
    const order = [...list.keys()].sort((a, b) => Number(list[b].locked) - Number(list[a].locked));
    for (const i of order) {
      const p = list[i];
      const bmp = bitmaps.get(`${p.r}-${p.c}`);
      if (!bmp) continue;
      if (!p.locked) {
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = drag.current?.index === i ? 16 : 6;
        ctx.shadowOffsetY = drag.current?.index === i ? 6 : 2;
      }
      ctx.drawImage(bmp, p.x - pad, p.y - pad, pw + pad * 2, ph + pad * 2);
      ctx.shadowColor = 'transparent';
      if (i === selected && !p.locked) {
        const path = art.current.paths.get(`${p.r}-${p.c}`);
        if (path) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 3;
          ctx.stroke(path);
          ctx.restore();
        }
      }
    }
  }, [ghost, layout, ph, pw, selected]);

  const drawRef = useRef(draw);
  drawRef.current = draw;

  const requestDraw = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(draw);
  }, [draw]);

  /** Paints the picture and cuts one bitmap per piece at the current resolution. */
  const buildArt = useCallback(
    (pictureSeed: string) => {
      const res = scaleRef.current * (window.devicePixelRatio || 1);
      const picture = document.createElement('canvas');
      picture.width = Math.round(PICTURE.w * res);
      picture.height = Math.round(PICTURE.h * res);
      const pctx = picture.getContext('2d');
      if (!pctx) return;
      pctx.scale(res, res);
      paintLandscape(pctx, PICTURE.w, PICTURE.h, pictureSeed);
      const tabs = makeTabs(cols, rows, createRng(`${pictureSeed}-tabs`).next);
      const pad = Math.min(pw, ph) * 0.3;
      const bitmaps = new Map<string, HTMLCanvasElement>();
      const paths = new Map<string, Path2D>();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const d = piecePath(tabs, cols, rows, r, c, pw, ph);
          const path = typeof Path2D === 'function' ? new Path2D(d) : null;
          const bmp = document.createElement('canvas');
          bmp.width = Math.ceil((pw + pad * 2) * res);
          bmp.height = Math.ceil((ph + pad * 2) * res);
          const b = bmp.getContext('2d');
          if (b && path) {
            b.scale(res, res);
            b.translate(pad, pad);
            b.save();
            b.clip(path);
            b.drawImage(picture, -c * pw, -r * ph, PICTURE.w, PICTURE.h);
            b.restore();
            b.strokeStyle = 'rgba(255,255,255,0.45)';
            b.lineWidth = 1.2;
            b.stroke(path);
            paths.set(`${r}-${c}`, path);
          }
          bitmaps.set(`${r}-${c}`, bmp);
        }
      }
      art.current = { picture, bitmaps, paths };
    },
    [cols, ph, pw, rows],
  );

  // Size the canvas to its container, keeping it sharp on HiDPI screens.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const apply = () => {
      const width = container.getBoundingClientRect().width;
      if (!width) return;
      const maxH = window.innerHeight * 0.78;
      let cssW = Math.min(width, 980);
      if ((cssW * layout.h) / layout.w > maxH) cssW = (maxH * layout.w) / layout.h;
      const cssH = (cssW * layout.h) / layout.w;
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      scaleRef.current = cssW / layout.w;
      buildArt(seed);
      drawRef.current();
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(container);
    return () => ro.disconnect();
  }, [buildArt, layout, seed]);

  useEffect(() => {
    requestDraw();
  }, [pieces, ghost, selected, requestDraw]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  /* ----------------------------------------------------------- game flow */

  const restart = useCallback(() => {
    setSeed(newSeed());
    setPieces(scatter(layout, cols, rows, Math.random));
    setHints(0);
    setSelected(-1);
    setStarted(false);
    setDone(false);
    reset(0);
    save.clear();
  }, [cols, layout, reset, rows, save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const commit = useCallback(
    (next: PieceState[], snappedNow: boolean, hintCount = hints) => {
      setPieces(next);
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      if (snappedNow) shell.play('pop');
      const count = next.filter((p) => p.locked).length;
      if (count === next.length) {
        setDone(true);
        const ms = read();
        save.clear();
        shell.play('levelComplete');
        void reportProgress('jigsaw-puzzle.first', 1);
        void incrementProgress('jigsaw-puzzle.ten');
        if (next.length >= 48) void reportProgress('jigsaw-puzzle.big', 1);
        if (next.length >= 24 && hintCount === 0 && !ghost) void reportProgress('jigsaw-puzzle.no-help', 1);
        shell.endRound({
          won: true,
          score: scoreFor(next.length, ms, hintCount),
          timeMs: ms,
          title: 'Picture complete!',
          details: [
            { label: 'Pieces', value: String(next.length) },
            { label: 'Hints', value: String(hintCount) },
          ],
        });
        return;
      }
      save.persist(
        { seed, kind: layout.kind, cols, pieces: next, ms: read(), hints: hintCount },
        { percent: Math.round((count / next.length) * 100), label: `${next.length} pieces · ${count} placed` },
      );
    },
    [cols, ghost, hints, layout.kind, read, save, seed, shell, started],
  );

  const toTable = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [(e.clientX - rect.left) / scaleRef.current, (e.clientY - rect.top) / scaleRef.current] as const;
  };

  const hitTest = (x: number, y: number): number => {
    const list = piecesRef.current;
    const probe = document.createElement('canvas').getContext('2d');
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      if (p.locked) continue;
      const path = art.current.paths.get(`${p.r}-${p.c}`);
      if (path && probe?.isPointInPath(path, x - p.x, y - p.y)) return i;
      if (!path && x >= p.x && y >= p.y && x <= p.x + pw && y <= p.y + ph) return i;
    }
    return -1;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (locked) return;
    const [x, y] = toTable(e);
    const i = hitTest(x, y);
    if (i < 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    // Bring the piece to the top of the pile.
    const list = piecesRef.current.slice();
    const [p] = list.splice(i, 1);
    list.push(p);
    piecesRef.current = list;
    setPieces(list);
    setSelected(list.length - 1);
    drag.current = { index: list.length - 1, dx: x - p.x, dy: y - p.y };
    shell.play('select');
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = toTable(e);
    const list = piecesRef.current.slice();
    const p = list[d.index];
    list[d.index] = {
      ...p,
      x: Math.max(-pw / 2, Math.min(layout.w - pw / 2, x - d.dx)),
      y: Math.max(-ph / 2, Math.min(layout.h - ph / 2, y - d.dy)),
    };
    piecesRef.current = list;
    requestDraw();
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const list = piecesRef.current.slice();
    const snapped = trySnap(layout, cols, rows, list[d.index]);
    list[d.index] = snapped;
    if (snapped.locked) setSelected(-1);
    commit(list, snapped.locked);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (locked) return;
    const list = piecesRef.current;
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      const loose = list.map((p, i) => (p.locked ? -1 : i)).filter((i) => i >= 0);
      if (!loose.length) return;
      const next = loose.find((i) => i > selected) ?? loose[0];
      setSelected(next);
      return;
    }
    if (selected < 0 || !list[selected] || list[selected].locked) return;
    const step = e.shiftKey ? 32 : 8;
    const moves: Record<string, [number, number]> = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
    if (e.key in moves) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      const copy = list.slice();
      copy[selected] = { ...copy[selected], x: copy[selected].x + dx, y: copy[selected].y + dy };
      piecesRef.current = copy;
      setPieces(copy);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const copy = list.slice();
      const snapped = trySnap(layout, cols, rows, copy[selected]);
      copy[selected] = snapped;
      if (snapped.locked) setSelected(-1);
      else shell.play('failure');
      commit(copy, snapped.locked);
    }
  };

  const placeHint = () => {
    if (locked) return;
    const list = piecesRef.current.slice();
    const loose = list.map((p, i) => (p.locked ? -1 : i)).filter((i) => i >= 0);
    if (!loose.length) return;
    const i = loose[Math.floor(Math.random() * loose.length)];
    const [hx, hy] = home(layout, cols, rows, list[i]);
    list[i] = { ...list[i], x: hx, y: hy, locked: true };
    setHints(hints + 1);
    setSelected(-1);
    commit(list, true, hints + 1);
  };

  const resume = () => {
    if (!pending) return;
    setSeed(pending.seed);
    setPieces(pending.pieces);
    setHints(pending.hints);
    reset(pending.ms);
    save.dismiss();
  };

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Placed', value: `${placed}/${pieces.length}` },
          { label: 'Time', value: formatClock(elapsed) },
          { label: 'Hints', value: hints },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`${pending.pieces.length} pieces · ${pending.pieces.filter((p) => p.locked).length} placed`}
          onContinue={resume}
          onNew={restart}
        />
      )}
      <StatusBar>
        {done ? 'The picture is complete!' : 'Drag pieces into the frame. A piece clicks into place when it is close to its spot.'}
      </StatusBar>
      <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label={`Jigsaw puzzle, ${placed} of ${pieces.length} pieces placed. Press N to pick a loose piece, arrow keys to move it (Shift for bigger steps), Enter to drop it.`}
          style={{ touchAction: 'none', borderRadius: 12, display: 'block' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        />
      </div>
      <PuzzleActions>
        <button type="button" className={`btn btn-sm${ghost ? ' btn-primary' : ''}`} onClick={() => setGhost(!ghost)} aria-pressed={ghost}>
          🖼️ Guide picture
        </button>
        <button type="button" className="btn btn-sm" onClick={placeHint} disabled={locked}>
          💡 Place a piece
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
