'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { PixelGrid, downloadDataUrl, floodFill, toPng } from '../_shared/creative/PixelGrid';
import { SpriteThumb } from '../_shared/creative/SpriteThumb';
import { SPRITES } from '../_shared/creative/sprites';
import type { Sprite } from '../_shared/creative/sprites';
import { PALETTE, accuracy, blank, mirrorOf, spriteCells, validSave } from './engine';
import type { Artwork, Cells } from './engine';
import '../_shared/creative/creative.css';

type Tool = 'pencil' | 'eraser' | 'fill' | 'picker';
const CHALLENGES = 3;
const PEEK_SECONDS = 12;

export default function PixelArtGame() {
  const shell = useGameShell();
  const [mode, setMode] = useState<'free' | 'challenge'>('challenge');
  const [size, setSize] = useState(16);
  const [cells, setCells] = useState<Cells>(() => blank(16));
  const [history, setHistory] = useState<Cells[]>([]);
  const [tool, setTool] = useState<Tool>('pencil');
  const [mirror, setMirror] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [gallery, setGallery] = useState<Artwork[]>([]);
  const save = useSavedGame('pixel-art', validSave);
  // Challenge state.
  const order = useMemo(
    () => [...SPRITES].sort(() => Math.random() - 0.5).slice(0, CHALLENGES),
    [],
  );
  const [color, setColor] = useState(() => Object.values(order[0].palette)[0]);
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [checked, setChecked] = useState<number | null>(null);
  const [peek, setPeek] = useState(PEEK_SECONDS);
  const started = useRef(false);
  const target: Sprite | null = mode === 'challenge' ? (order[round] ?? null) : null;
  const targetCells = useMemo(() => (target ? spriteCells(target) : null), [target]);
  const palette = target ? Object.values(target.palette) : PALETTE;

  useEffect(() => {
    if (save.saved) setGallery(save.saved.gallery);
  }, [save.saved]);

  const begin = useCallback(() => {
    if (started.current) return;
    started.current = true;
    shell.startRound();
  }, [shell]);

  const reset = useCallback(
    (nextMode = mode, nextSize = size) => {
      setCells(blank(nextSize));
      setHistory([]);
      setChecked(null);
      setPeek(PEEK_SECONDS);
      if (nextMode === 'challenge')
        setColor((order[0] && Object.values(order[0].palette)[0]) ?? PALETTE[0]);
    },
    [mode, order, size],
  );

  const restart = useCallback(() => {
    setRound(0);
    setScores([]);
    started.current = false;
    reset();
  }, [reset]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  // Hard mode: the target can only be studied for a few seconds.
  useEffect(() => {
    if (
      mode !== 'challenge' ||
      shell.difficulty !== 'hard' ||
      checked !== null ||
      peek <= 0 ||
      shell.paused
    )
      return;
    const id = window.setTimeout(() => setPeek((p) => p - 1), 1000);
    return () => window.clearTimeout(id);
  }, [checked, mode, peek, shell.difficulty, shell.paused]);

  const paint = useCallback(
    (i: number, first: boolean) => {
      if (shell.paused || checked !== null) return;
      begin();
      if (tool === 'picker') {
        const c = cells[i];
        if (c) setColor(c);
        setTool('pencil');
        return;
      }
      setCells((prev) => {
        if (first) setHistory((h) => [...h.slice(-49), prev]);
        const value = tool === 'eraser' ? null : color;
        if (tool === 'fill') return floodFill(prev, size, i, value);
        const next = [...prev];
        next[i] = value;
        if (mirror) next[mirrorOf(i, size)] = value;
        return next;
      });
    },
    [begin, cells, checked, color, mirror, shell.paused, size, tool],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      setCells(h[h.length - 1]);
      return h.slice(0, -1);
    });
  }, []);

  const check = useCallback(() => {
    if (!targetCells || checked !== null) return;
    begin();
    const acc = accuracy(cells, targetCells);
    setChecked(acc);
    const all = [...scores, acc];
    setScores(all);
    shell.play(acc >= 0.95 ? 'success' : acc >= 0.7 ? 'coin' : 'failure');
    if (acc === 1) void reportProgress('pixel-art.perfect', 1);
    if (acc >= 0.9) void incrementProgress('pixel-art.copies', 1);
    if (all.length >= CHALLENGES) {
      const avg = all.reduce((a, b) => a + b, 0) / all.length;
      if (shell.difficulty === 'hard' && avg >= 0.9) void reportProgress('pixel-art.hard', 1);
      shell.endRound({
        won: avg >= 0.8,
        score: Math.round(avg * 1000),
        title: `Average accuracy ${Math.round(avg * 100)}%`,
        details: order.map((s, i) => ({
          label: s.name,
          value: `${Math.round((all[i] ?? 0) * 100)}%`,
        })),
      });
    }
  }, [begin, cells, checked, order, scores, shell, targetCells]);

  const nextChallenge = useCallback(() => {
    setRound((r) => r + 1);
    setCells(blank(16));
    setHistory([]);
    setChecked(null);
    setPeek(PEEK_SECONDS);
    const s = order[round + 1];
    if (s) setColor(Object.values(s.palette)[0]);
  }, [order, round]);

  const saveArt = useCallback(() => {
    const next = [{ size, cells, savedAt: Date.now() }, ...gallery].slice(0, 12);
    setGallery(next);
    save.persist({ gallery: next }, { label: `${next.length} artworks` });
    void reportProgress('pixel-art.save', 1);
    void reportProgress('pixel-art.gallery', next.length);
    shell.play('success');
  }, [cells, gallery, save, shell, size]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT') return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') {
        e.preventDefault();
        undo();
      } else if (k === 'z') undo();
      else if (k === 'b') setTool('pencil');
      else if (k === 'e') setTool('eraser');
      else if (k === 'g') setTool('fill');
      else if (k === 'i') setTool('picker');
      else if (k.startsWith('arrow')) {
        e.preventDefault();
        setCursor((c) => {
          const x = Math.min(
            size - 1,
            Math.max(0, (c % size) + (k === 'arrowright' ? 1 : k === 'arrowleft' ? -1 : 0)),
          );
          const y = Math.min(
            size - 1,
            Math.max(0, Math.floor(c / size) + (k === 'arrowdown' ? 1 : k === 'arrowup' ? -1 : 0)),
          );
          return y * size + x;
        });
      } else if ((k === ' ' || k === 'enter') && tag !== 'BUTTON') {
        e.preventDefault();
        paint(cursor, true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor, paint, size, undo]);

  const showGhost = mode === 'challenge' && shell.difficulty === 'easy' && checked === null;
  const showPreview =
    mode === 'challenge' && (shell.difficulty !== 'hard' || peek > 0 || checked !== null);

  return (
    <div className="cr">
      <div className="cr-wide">
        <GameHud
          items={
            mode === 'challenge'
              ? [
                  { label: 'Picture', value: `${Math.min(round + 1, CHALLENGES)}/${CHALLENGES}` },
                  {
                    label: 'Last',
                    value: checked === null ? '–' : `${Math.round(checked * 100)}%`,
                  },
                  {
                    label: 'Average',
                    value: scores.length
                      ? `${Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100)}%`
                      : '–',
                  },
                ]
              : [
                  { label: 'Canvas', value: `${size}×${size}` },
                  { label: 'Gallery', value: gallery.length },
                ]
          }
        />
      </div>
      <section className="cr-panel" aria-label="Canvas">
        <PixelGrid
          size={size}
          colors={cells}
          onPaint={paint}
          cursor={cursor}
          ghost={showGhost && targetCells ? (i) => targetCells[i] : undefined}
          ariaLabel="Pixel canvas — drag to paint; arrow keys and Space also paint"
        />
        <div className="cr-row" role="toolbar" aria-label="Tools">
          {(['pencil', 'eraser', 'fill', 'picker'] as Tool[]).map((t) => (
            <button
              key={t}
              type="button"
              className="btn btn-sm cr-tool"
              aria-pressed={tool === t}
              onClick={() => setTool(t)}
            >
              {t === 'pencil'
                ? '✏️ Pencil (B)'
                : t === 'eraser'
                  ? '🧽 Eraser (E)'
                  : t === 'fill'
                    ? '🪣 Fill (G)'
                    : '💧 Pick (I)'}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-sm cr-tool"
            aria-pressed={mirror}
            onClick={() => setMirror((m) => !m)}
          >
            ⇋ Mirror
          </button>
          <button type="button" className="btn btn-sm" onClick={undo} disabled={!history.length}>
            ↶ Undo (Z)
          </button>
          <button type="button" className="btn btn-sm" onClick={() => reset()}>
            Clear
          </button>
        </div>
      </section>
      <section className="cr-panel" aria-label="Palette and options">
        <div className="cr-row">
          <button
            type="button"
            className={`btn btn-sm ${mode === 'challenge' ? 'btn-primary' : ''}`}
            onClick={() => {
              setMode('challenge');
              setSize(16);
              reset('challenge', 16);
            }}
          >
            🎯 Copy challenge
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'free' ? 'btn-primary' : ''}`}
            onClick={() => {
              setMode('free');
              reset('free', size);
            }}
          >
            🎨 Free drawing
          </button>
        </div>
        {mode === 'challenge' && target && (
          <div className="cr-row" style={{ alignItems: 'flex-start' }}>
            <div style={{ width: 120 }}>
              {showPreview ? (
                <SpriteThumb sprite={target} />
              ) : (
                <div className="small muted">Picture hidden — paint it from memory!</div>
              )}
            </div>
            <div className="small" style={{ flex: 1 }}>
              Copy the <strong>{target.name}</strong> as exactly as you can, using its colours.
              {shell.difficulty === 'hard' && checked === null && peek > 0 && (
                <div>Memorise it: hidden in {peek}s</div>
              )}
              {checked !== null && (
                <div style={{ marginTop: 6 }}>
                  <strong>{Math.round(checked * 100)}% accurate.</strong>{' '}
                  {round + 1 < CHALLENGES && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={nextChallenge}
                    >
                      Next picture
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="cr-swatches" role="radiogroup" aria-label="Colours">
          {palette.map((c) => (
            <button
              key={c}
              type="button"
              className="cr-swatch"
              style={{ background: c }}
              aria-label={`Colour ${c}`}
              aria-pressed={color === c && tool !== 'eraser'}
              onClick={() => {
                setColor(c);
                if (tool === 'eraser' || tool === 'picker') setTool('pencil');
              }}
            />
          ))}
        </div>
        {mode === 'free' && (
          <label className="small cr-row">
            Custom colour{' '}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Custom colour"
            />
          </label>
        )}
        {mode === 'challenge' ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={check}
            disabled={checked !== null}
          >
            ✅ Check my copy
          </button>
        ) : (
          <>
            <div className="cr-row">
              {[16, 32].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`btn btn-sm ${size === n ? 'btn-primary' : ''}`}
                  onClick={() => {
                    setSize(n);
                    setCursor(0);
                    reset('free', n);
                  }}
                >
                  {n}×{n}
                </button>
              ))}
              <button type="button" className="btn btn-sm" onClick={saveArt}>
                💾 Save to gallery
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  downloadDataUrl(toPng(cells, size, size === 16 ? 32 : 16), 'pixel-art.png');
                  void reportProgress('pixel-art.export', 1);
                }}
              >
                ⬇️ Download PNG
              </button>
            </div>
            {gallery.length > 0 && (
              <div className="cr-thumbs" aria-label="Your gallery">
                {gallery.map((a) => (
                  <button
                    key={a.savedAt}
                    type="button"
                    className="cr-thumb"
                    onClick={() => {
                      setSize(a.size);
                      setCells([...a.cells]);
                      setHistory([]);
                    }}
                    aria-label="Open saved artwork"
                  >
                    <SpriteThumb colors={a.cells} size={a.size} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
