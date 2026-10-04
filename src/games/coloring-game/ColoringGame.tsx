'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { isRecord } from '../_shared/puzzle/useSavedGame';
import { ColorRegions, filledCount, paintableCount } from '../_shared/creative/ColorRegions';
import { PAGES } from './pages';
import '../_shared/creative/creative.css';

interface ColoringSave {
  fills: Record<string, Record<string, string>>;
  done: string[];
}

function validSave(v: unknown): v is ColoringSave {
  return (
    isRecord(v) &&
    isRecord(v.fills) &&
    Object.entries(v.fills).every(
      ([k, f]) =>
        PAGES.some((p) => p.id === k) &&
        isRecord(f) &&
        Object.values(f).every((c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)),
    ) &&
    Array.isArray(v.done) &&
    v.done.every((d) => typeof d === 'string')
  );
}

export default function ColoringGame() {
  const shell = useGameShell();
  const [pageId, setPageId] = useState(PAGES[0].id);
  const [all, setAll] = useState<Record<string, Record<string, string>>>({});
  const [done, setDone] = useState<string[]>([]);
  const [history, setHistory] = useState<Record<string, string>[]>([]);
  const [started, setStarted] = useState(false);
  const save = useSavedGame('coloring-game', validSave);
  const page = PAGES.find((p) => p.id === pageId) ?? PAGES[0];
  const fills = useMemo(() => all[page.id] ?? {}, [all, page.id]);
  const total = paintableCount(page.regions);
  const filled = filledCount(page.regions, fills);

  useEffect(() => {
    if (!save.saved) return;
    setAll(save.saved.fills);
    setDone(save.saved.done);
  }, [save.saved]);

  const restart = useCallback(() => {
    setAll((a) => ({ ...a, [pageId]: {} }));
    setHistory([]);
  }, [pageId]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  // Easy pages start with the background already coloured in.
  useEffect(() => {
    if (shell.difficulty !== 'easy' || all[page.id]) return;
    const bg = page.regions[0];
    setAll((a) => ({
      ...a,
      [page.id]: {
        [bg.id]: page.id === 'rocket' ? '#1e1b4b' : page.id === 'sea' ? '#38bdf8' : '#bae6fd',
      },
    }));
  }, [all, page, shell.difficulty]);

  const onFill = useCallback(
    (ids: string[], color: string) => {
      if (shell.paused) return;
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      setHistory((h) => [...h.slice(-40), fills]);
      const next = { ...fills };
      for (const id of ids) next[id] = color;
      const nextAll = { ...all, [page.id]: next };
      setAll(nextAll);
      shell.play('pop');
      const complete = filledCount(page.regions, next) === total;
      const nextDone = complete && !done.includes(page.id) ? [...done, page.id] : done;
      setDone(nextDone);
      save.persist(
        { fills: nextAll, done: nextDone },
        { percent: Math.round((filledCount(page.regions, next) / total) * 100), label: page.name },
      );
      void incrementProgress('coloring-game.shapes', ids.length);
      if (complete) {
        const colours = new Set(Object.values(next)).size;
        void reportProgress('coloring-game.first', 1);
        void reportProgress('coloring-game.all', nextDone.length);
        if (colours >= 10) void reportProgress('coloring-game.rainbow', 1);
        shell.play('levelComplete');
        shell.endRound({
          won: true,
          score: total * 10 + colours * 15,
          title: `${page.name} finished!`,
          details: [
            { label: 'Shapes coloured', value: String(total) },
            { label: 'Colours used', value: String(colours) },
            { label: 'Pages finished', value: `${nextDone.length}/${PAGES.length}` },
          ],
        });
      }
    },
    [all, done, fills, page, save, shell, started, total],
  );

  return (
    <div className="cr">
      <div className="cr-wide">
        <GameHud
          items={[
            { label: 'Page', value: page.name },
            { label: 'Coloured', value: `${filled}/${total}` },
            { label: 'Finished', value: `${done.length}/${PAGES.length}` },
          ]}
        />
      </div>
      <section className="cr-panel" aria-label="Colouring page">
        <ColorRegions
          regions={page.regions}
          viewBox="0 0 200 150"
          fills={fills}
          onFill={onFill}
          symmetry={false}
          title={page.name}
          strokeWidth={shell.difficulty === 'hard' ? 0.5 : 0.9}
        />
      </section>
      <section className="cr-panel" aria-label="Pages">
        <div className="cr-thumbs">
          {PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              className="cr-thumb"
              aria-pressed={p.id === page.id}
              onClick={() => {
                setPageId(p.id);
                setHistory([]);
              }}
            >
              <span style={{ fontSize: '1.8rem' }}>{p.icon}</span>
              {p.name}
              {done.includes(p.id) ? ' ✓' : ''}
            </button>
          ))}
        </div>
        <div className="cr-row">
          <button
            type="button"
            className="btn btn-sm"
            disabled={!history.length}
            onClick={() => {
              setAll((a) => ({ ...a, [page.id]: history[history.length - 1] }));
              setHistory((h) => h.slice(0, -1));
            }}
          >
            ↶ Undo
          </button>
          <button type="button" className="btn btn-sm" onClick={restart}>
            🧽 Start this page again
          </button>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Colour every part of the picture to finish the page. Your colouring is saved as you go.
        </p>
      </section>
    </div>
  );
}
