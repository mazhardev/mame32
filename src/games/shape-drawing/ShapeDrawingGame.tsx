import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { Sketchpad, UNITS } from '../_shared/creative/Sketchpad';
import type { InkStroke } from '../_shared/creative/Sketchpad';
import { ROUNDS, SHAPES, TUNING, accuracy, pickShapes } from './engine';
import type { Stroke } from '../_shared/creative/drawings';
import '../_shared/casual/casual.css';

export default function ShapeDrawingGame() {
  const shell = useGameShell();
  const t = TUNING[shell.difficulty];
  const [order, setOrder] = useState(() => pickShapes(t, Math.random));
  const [round, setRound] = useState(0);
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [result, setResult] = useState<number | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const started = useRef(false);
  const shape = SHAPES.find((s) => s.id === order[round]) ?? SHAPES[0];

  const restart = useCallback(() => {
    setOrder(pickShapes(TUNING[shell.difficulty], Math.random));
    setRound(0);
    setStrokes([]);
    setResult(null);
    setScores([]);
    started.current = false;
  }, [shell.difficulty]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const judge = useCallback(() => {
    if (result !== null || strokes.length === 0) return;
    const drawn: Stroke[] = strokes.map((s) => s.pts);
    const acc = accuracy(drawn, shape, t.tolerance);
    setResult(acc);
    const all = [...scores, acc];
    setScores(all);
    shell.play(acc >= 0.85 ? 'success' : acc >= 0.6 ? 'coin' : 'failure');
    if (acc >= 0.9) void reportProgress('shape-drawing.great', 1);
    if (shape.id === 'circle' && acc >= 0.95) void reportProgress('shape-drawing.circle', 1);
    void incrementProgress('shape-drawing.shapes', 1);
    if (all.length >= ROUNDS) {
      const avg = all.reduce((a, b) => a + b, 0) / all.length;
      if (shell.difficulty === 'hard' && avg >= 0.8) void reportProgress('shape-drawing.hard', 1);
      void reportProgress('shape-drawing.average', Math.round(avg * 100));
      shell.endRound({
        won: avg >= 0.7,
        score: Math.round(avg * 1000),
        title: `Average accuracy ${Math.round(avg * 100)}%`,
        details: order.map((id, i) => ({
          label: SHAPES.find((s) => s.id === id)?.name ?? id,
          value: `${Math.round((all[i] ?? 0) * 100)}%`,
        })),
      });
    }
  }, [order, result, scores, shape, shell, strokes, t.tolerance]);

  const next = useCallback(() => {
    if (round + 1 >= ROUNDS) return;
    setRound((r) => r + 1);
    setStrokes([]);
    setResult(null);
  }, [round]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === 'BUTTON') return;
      if (e.key === 'Enter') {
        if (result === null) judge();
        else next();
      } else if (e.key.toLowerCase() === 'c' && result === null) setStrokes([]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [judge, next, result]);

  // After judging, show the ideal shape fitted over the drawing.
  const overlay = useMemo(() => {
    if (result === null || strokes.length === 0) return undefined;
    const pts = strokes.flatMap((s) => s.pts);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const tp = shape.strokes.flat();
    const txs = tp.map((p) => p[0]);
    const tys = tp.map((p) => p[1]);
    const tsize =
      Math.max(Math.max(...txs) - Math.min(...txs), Math.max(...tys) - Math.min(...tys)) || 1;
    const tcx = (Math.max(...txs) + Math.min(...txs)) / 2;
    const tcy = (Math.max(...tys) + Math.min(...tys)) / 2;
    return (ctx: CanvasRenderingContext2D, k: number) => {
      ctx.strokeStyle = 'rgba(34,197,94,0.55)';
      ctx.lineWidth = 10 * k;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (const s of shape.strokes) {
        ctx.beginPath();
        s.forEach(([x, y], i) => {
          const px = (cx + ((x - tcx) / tsize) * size) * k;
          const py = (cy + ((y - tcy) / tsize) * size) * k;
          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        });
        ctx.stroke();
      }
    };
  }, [result, shape, strokes]);

  const avg = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100)
    : null;

  return (
    <div className="cz">
      <GameHud
        items={[
          { label: 'Shape', value: `${Math.min(round + 1, ROUNDS)}/${ROUNDS}` },
          { label: 'Last', value: result === null ? '–' : `${Math.round(result * 100)}%` },
          { label: 'Average', value: avg === null ? '–' : `${avg}%` },
        ]}
      />
      <div className="cz-panel">
        <div className="cz-status">
          Draw a <strong>{shape.name.toLowerCase()}</strong>
        </div>
        <Sketchpad
          strokes={strokes}
          onChange={(s) => {
            if (!started.current) {
              started.current = true;
              shell.startRound();
            }
            setStrokes(s);
          }}
          color="#1f2937"
          width={UNITS / 90}
          disabled={result !== null || shell.paused}
          overlay={overlay}
          ariaLabel={`Drawing area — draw a ${shape.name}`}
        />
        <div className="cz-status" aria-live="polite">
          {result === null
            ? 'Use one or more strokes, then press Done.'
            : `${Math.round(result * 100)}% — ${result >= 0.9 ? 'superb!' : result >= 0.75 ? 'nicely done.' : result >= 0.5 ? 'not bad.' : 'keep practising.'} The green line shows the ideal shape.`}
        </div>
        <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
          {result === null ? (
            <>
              <button
                type="button"
                className="btn"
                onClick={() => setStrokes([])}
                disabled={!strokes.length}
              >
                Clear (C)
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={judge}
                disabled={!strokes.length}
              >
                Done ✓ (Enter)
              </button>
            </>
          ) : (
            round + 1 < ROUNDS && (
              <button type="button" className="btn btn-primary" onClick={next}>
                Next shape (Enter)
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
