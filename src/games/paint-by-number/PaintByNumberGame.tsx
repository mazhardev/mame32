'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { PixelGrid } from '../_shared/creative/PixelGrid';
import { SpriteThumb } from '../_shared/creative/SpriteThumb';
import { SPRITES } from '../_shared/creative/sprites';
import { PUZZLES, blankPaint, complete, progress, validSave } from './engine';
import type { Paint, PbnSave } from './engine';
import '../_shared/creative/creative.css';

export default function PaintByNumberGame() {
  const shell = useGameShell();
  const hard = shell.difficulty === 'hard';
  const easy = shell.difficulty === 'easy';
  const [pid, setPid] = useState(PUZZLES[0].id);
  const [paint, setPaint] = useState<Paint>(blankPaint);
  const [num, setNum] = useState(1);
  const [mistakes, setMistakes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [finished, setFinished] = useState(false);
  const save = useSavedGame('paint-by-number', validSave);
  const [pending, setPending] = useState<PbnSave['current']>(null);
  const started = useRef(false);
  const puzzle = PUZZLES.find((p) => p.id === pid) ?? PUZZLES[0];

  useEffect(() => {
    if (!save.saved) return;
    setDone(save.saved.done);
    if (save.saved.current && !started.current) setPending(save.saved.current);
  }, [save.saved]);

  const persist = useCallback(
    (cur: PbnSave['current'], doneList = done) =>
      save.persist(
        { current: cur, done: doneList },
        {
          percent: cur
            ? Math.round(
                progress(
                  PUZZLES.find((p) => p.id === cur.id)!,
                  cur.paint,
                ) * 100,
              )
            : 100,
          label: cur ? PUZZLES.find((p) => p.id === cur.id)!.name : 'Gallery',
        },
      ),
    [done, save],
  );

  const open = useCallback((id: string) => {
    setPid(id);
    setPaint(blankPaint());
    setMistakes(0);
    setSeconds(0);
    setFinished(false);
    setNum(1);
    started.current = false;
  }, []);

  const restart = useCallback(() => open(pid), [open, pid]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  useEffect(() => {
    if (!started.current || finished || shell.paused) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [finished, shell.paused, paint]);

  const finish = useCallback(
    (final: Paint) => {
      setFinished(true);
      const list = done.includes(puzzle.id) ? done : [...done, puzzle.id];
      setDone(list);
      persist(null, list);
      shell.play('levelComplete');
      void reportProgress('paint-by-number.first', 1);
      void reportProgress('paint-by-number.gallery', list.length);
      if (mistakes === 0) void reportProgress('paint-by-number.clean', 1);
      void incrementProgress('paint-by-number.cells', final.length);
      if (hard && mistakes === 0) void reportProgress('paint-by-number.hard', 1);
      shell.endRound({
        won: true,
        score: Math.max(50, 1000 - mistakes * 25 - seconds),
        title: `${puzzle.name} complete!`,
        details: [
          { label: 'Time', value: `${Math.floor(seconds / 60)}m ${seconds % 60}s` },
          { label: 'Mistakes', value: String(mistakes) },
          { label: 'Pictures finished', value: `${list.length}/${PUZZLES.length}` },
        ],
      });
    },
    [done, hard, mistakes, persist, puzzle, seconds, shell],
  );

  const paintCell = useCallback(
    (i: number) => {
      if (finished || shell.paused || pending) return;
      if (!started.current) {
        started.current = true;
        shell.startRound();
      }
      setPaint((prev) => {
        if (prev[i] === puzzle.answer[i]) return prev;
        const right = puzzle.answer[i] === num;
        if (!right) {
          setMistakes((m) => m + 1);
          shell.play('failure');
          // On Hard a wrong colour goes on anyway and must be painted over.
          if (!hard) return prev;
        }
        const next = [...prev];
        next[i] = num;
        if (right && complete(puzzle, next)) window.setTimeout(() => finish(next), 0);
        else persist({ id: puzzle.id, paint: next, mistakes, seconds });
        return next;
      });
    },
    [finish, finished, hard, mistakes, num, pending, persist, puzzle, seconds, shell],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (/^[1-9]$/.test(k) && Number(k) < puzzle.colors.length + 1)
        setNum(Number(k) === puzzle.colors.length ? 0 : Number(k));
      else if (k === '0') setNum(0);
      else if (k.startsWith('Arrow')) {
        e.preventDefault();
        setCursor((c) => {
          const x = Math.min(
            15,
            Math.max(0, (c % 16) + (k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0)),
          );
          const y = Math.min(
            15,
            Math.max(0, Math.floor(c / 16) + (k === 'ArrowDown' ? 1 : k === 'ArrowUp' ? -1 : 0)),
          );
          return y * 16 + x;
        });
      } else if (
        (k === ' ' || k === 'Enter') &&
        (e.target as HTMLElement | null)?.tagName !== 'BUTTON'
      ) {
        e.preventDefault();
        paintCell(cursor);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor, paintCell, puzzle.colors.length]);

  const colors = useMemo(
    () => paint.map((n) => (n < 0 ? null : puzzle.colors[n])),
    [paint, puzzle],
  );
  const remaining = (n: number) => puzzle.answer.filter((a, i) => a === n && paint[i] !== n).length;
  const pct = Math.round(progress(puzzle, paint) * 100);

  return (
    <div className="cr">
      <div className="cr-wide">
        <GameHud
          items={[
            { label: 'Picture', value: puzzle.name },
            { label: 'Done', value: `${pct}%` },
            { label: 'Mistakes', value: mistakes },
            {
              label: 'Time',
              value: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
            },
          ]}
        />
      </div>
      {pending && (
        <div className="cr-wide">
          <ResumePrompt
            label={`${PUZZLES.find((p) => p.id === pending.id)?.name} · ${Math.round(
              progress(
                PUZZLES.find((p) => p.id === pending.id)!,
                pending.paint,
              ) * 100,
            )}%`}
            onContinue={() => {
              setPid(pending.id);
              setPaint(pending.paint);
              setMistakes(pending.mistakes);
              setSeconds(pending.seconds);
              setPending(null);
              save.dismiss();
              started.current = true;
              shell.startRound();
            }}
            onNew={() => {
              setPending(null);
              save.dismiss();
            }}
          />
        </div>
      )}
      <section className="cr-panel" aria-label="Picture">
        <PixelGrid
          size={16}
          colors={colors}
          onPaint={(i) => paintCell(i)}
          labels={(i) =>
            paint[i] === puzzle.answer[i]
              ? null
              : String(puzzle.answer[i] === 0 ? 0 : puzzle.answer[i])
          }
          highlight={easy ? (i) => puzzle.answer[i] === num && paint[i] !== num : undefined}
          cursor={cursor}
          ariaLabel={`${puzzle.name} paint-by-number grid, ${pct}% painted`}
        />
      </section>
      <section className="cr-panel" aria-label="Colours and pictures">
        <div
          className="cr-swatches"
          role="radiogroup"
          aria-label="Numbered colours"
          style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}
        >
          {puzzle.colors.map((c, n) => {
            const left = remaining(n);
            return (
              <button
                key={n}
                type="button"
                className={`cr-swatch${left === 0 ? ' done' : ''}`}
                style={{ background: c }}
                aria-pressed={num === n}
                aria-label={`Colour ${n}, ${left} cells left`}
                onClick={() => setNum(n)}
              >
                {n}
              </button>
            );
          })}
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Pick a number, then tap or drag over the matching cells.{' '}
          {easy
            ? 'Cells for the chosen number are highlighted.'
            : hard
              ? 'Careful: wrong colours stick and must be painted over.'
              : ''}
        </p>
        <strong className="small">Pictures</strong>
        <div className="cr-thumbs">
          {PUZZLES.map((p) => {
            const sprite = SPRITES.find((s) => s.id === p.id);
            const isDone = done.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                className="cr-thumb"
                aria-pressed={pid === p.id}
                onClick={() => open(p.id)}
                aria-label={`${p.name}${isDone ? ' (finished)' : ''}`}
              >
                {isDone && sprite ? (
                  <SpriteThumb sprite={sprite} />
                ) : (
                  <span style={{ fontSize: '1.6rem', lineHeight: '48px' }}>🖌️</span>
                )}
                {p.name}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
