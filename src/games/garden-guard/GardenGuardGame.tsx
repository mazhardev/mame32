import { useMemo, useRef } from 'react';
import { useGameShell } from '@/game-engine/context';
import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { highestUnlocked, levelKey, usePackLevels } from '../_shared/puzzle/levels';
import '../_shared/puzzle/puzzle.css';
import '../_shared/platform/campaign.css';
import { GARDENS, LEVELS, PER_GARDEN } from './data';
import type { State } from './engine';
import { ID, makeSpec } from './spec';

const PACK = 'lawn';
const noSave = (_: unknown): _ is never => false;

export default function GardenGuardGame() {
  const shell = useGameShell();
  const levels = usePackLevels(ID, PACK, LEVELS.length, noSave, shell.requestRestart, {
    packNames: { [PACK]: 'Garden' },
    better: (a, b) => a > b,
  });
  const ref = useRef(levels);
  ref.current = levels;

  const spec = useMemo(() => {
    const base = makeSpec(() => ref.current.indexRef.current);
    return {
      ...base,
      onEnd: (s, d) => {
        base.onEnd?.(s, d);
        if (s.phase === 'won') ref.current.recordSolve(levelKey(PACK, s.level), s.score);
      },
      result: (s) => {
        const r = base.result(s);
        if (s.phase !== 'won' || s.level >= LEVELS.length - 1) return r;
        return { ...r, next: { label: 'Next level →', action: () => ref.current.select(s.level + 1) } };
      },
    } as ArcadeSpec<State>;
  }, []);

  if (!levels.ready) return <div className="campaign" aria-busy="true" />;
  const open = highestUnlocked(levels.progress.solved, PACK, LEVELS.length);
  const index = levels.index;

  return (
    <div className="campaign">
      {!shell.isFullscreen && (
        <div className="campaign-starts">
          <div className="pz-levels">
            <button type="button" className="icon-btn" onClick={() => levels.select(index - 1)} disabled={index === 0} aria-label="Previous level">
              ◀
            </button>
            <select className="select" value={index} aria-label="Level" onChange={(e) => levels.select(Number(e.target.value))}>
              {GARDENS.map((garden, g) => (
                <optgroup key={garden} label={garden}>
                  {LEVELS.slice(g * PER_GARDEN, (g + 1) * PER_GARDEN).map((l) => {
                    const done = levels.progress.solved[levelKey(PACK, l.index)] !== undefined;
                    return (
                      <option key={l.index} value={l.index} disabled={l.index > open}>
                        {`${l.index + 1}. ${l.name}${l.index > open ? ' 🔒' : done ? ' ✓' : ''}`}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
            <button type="button" className="icon-btn" onClick={() => levels.select(index + 1)} disabled={index >= open} aria-label="Next level">
              ▶
            </button>
          </div>
        </div>
      )}
      <ArcadeGame spec={spec} maxHeight={0.74} />
    </div>
  );
}
