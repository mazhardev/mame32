import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { ColorRegions, filledCount, paintableCount } from '../_shared/creative/ColorRegions';
import { makeMandala, validSave } from './mandala';
import type { MandalaSave } from './mandala';
import '../_shared/creative/creative.css';

export default function MandalaGame() {
  const shell = useGameShell();
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const [fills, setFills] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, string>[]>([]);
  const [symmetry, setSymmetry] = useState(shell.difficulty !== 'hard');
  const [finished, setFinished] = useState(0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const save = useSavedGame('mandala-coloring', validSave);
  const [pending, setPending] = useState<MandalaSave | null>(null);
  const regions = useMemo(() => makeMandala(seed, shell.difficulty), [seed, shell.difficulty]);
  const total = paintableCount(regions);
  const filled = filledCount(regions, fills);

  useEffect(() => {
    if (!save.saved) return;
    setFinished(save.saved.finished);
    if (save.saved.difficulty === shell.difficulty && Object.keys(save.saved.fills).length > 0)
      setPending(save.saved);
  }, [save.saved, shell.difficulty]);

  const fresh = useCallback(() => {
    setSeed(Math.floor(Math.random() * 1e6));
    setFills({});
    setHistory([]);
    setDone(false);
    setStarted(false);
  }, []);
  useEffect(() => shell.registerRestart(fresh), [shell, fresh]);

  const onFill = useCallback(
    (ids: string[], color: string) => {
      if (done || shell.paused) return;
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      setHistory((h) => [...h.slice(-40), fills]);
      const next = { ...fills };
      for (const id of ids) next[id] = color;
      setFills(next);
      shell.play('pop');
      const colours = new Set(Object.values(next)).size;
      if (colours >= 8) void reportProgress('mandala-coloring.palette', 1);
      save.persist(
        { seed, difficulty: shell.difficulty, fills: next, finished },
        {
          percent: Math.round((filledCount(regions, next) / total) * 100),
          label: 'Mandala in progress',
        },
      );
      if (filledCount(regions, next) === total) {
        const count = finished + 1;
        setFinished(count);
        setDone(true);
        save.persist(
          { seed, difficulty: shell.difficulty, fills: {}, finished: count },
          { percent: 100, label: `${count} mandalas finished` },
        );
        void reportProgress('mandala-coloring.first', 1);
        void reportProgress('mandala-coloring.five', count);
        void incrementProgress('mandala-coloring.regions', total);
        if (shell.difficulty === 'hard' && !symmetry)
          void reportProgress('mandala-coloring.hard', 1);
        shell.endRound({
          won: true,
          score: total * 10 + colours * 20,
          title: 'Mandala complete!',
          details: [
            { label: 'Shapes coloured', value: String(total) },
            { label: 'Colours used', value: String(colours) },
            { label: 'Mandalas finished', value: String(count) },
          ],
        });
      }
    },
    [done, fills, finished, regions, save, seed, shell, started, symmetry, total],
  );

  return (
    <div className="cr">
      <div className="cr-wide">
        <GameHud
          items={[
            { label: 'Coloured', value: `${filled}/${total}` },
            { label: 'Symmetry', value: symmetry ? 'On' : 'Off' },
            { label: 'Finished', value: finished },
          ]}
        />
      </div>
      {pending && (
        <div className="cr-wide">
          <ResumePrompt
            label={`${Object.keys(pending.fills).length} shapes coloured`}
            onContinue={() => {
              setSeed(pending.seed);
              setFills(pending.fills);
              setPending(null);
              save.dismiss();
              setStarted(true);
              shell.startRound();
            }}
            onNew={() => {
              setPending(null);
              save.dismiss();
            }}
          />
        </div>
      )}
      <section className="cr-panel cr-wide" aria-label="Mandala">
        <ColorRegions
          regions={regions}
          viewBox="-100 -100 200 200"
          fills={fills}
          onFill={onFill}
          symmetry={symmetry}
          title="Mandala"
          strokeWidth={0.6}
        />
        <div className="cr-row">
          <button
            type="button"
            className={`btn btn-sm cr-tool`}
            aria-pressed={symmetry}
            onClick={() => setSymmetry((s) => !s)}
          >
            ✳️ Symmetry fill {symmetry ? 'on' : 'off'}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={!history.length}
            onClick={() => {
              setFills(history[history.length - 1]);
              setHistory((h) => h.slice(0, -1));
            }}
          >
            ↶ Undo
          </button>
          <button type="button" className="btn btn-sm" onClick={fresh}>
            🔄 New mandala
          </button>
        </div>
      </section>
    </div>
  );
}
