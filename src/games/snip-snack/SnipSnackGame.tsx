import { useMemo, useRef } from 'react';
import { reportProgress } from '@/achievements/AchievementService';
import { useGameShell } from '@/game-engine/context';
import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { highestUnlocked, levelKey, usePackLevels } from '../_shared/puzzle/levels';
import '../_shared/puzzle/puzzle.css';
import '../_shared/platform/campaign.css';
import type { State } from './engine';
import { BOXES, LEVELS, PER_BOX } from './levels';
import { ID, makeSpec, starText, starsFor } from './spec';

const PACK = 'boxes';
const noSave = (_: unknown): _ is never => false;

export default function SnipSnackGame() {
  const shell = useGameShell();
  const levels = usePackLevels(ID, PACK, LEVELS.length, noSave, shell.requestRestart, {
    packNames: { [PACK]: 'Boxes' },
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
        if (s.phase !== 'won') return;
        const key = levelKey(PACK, s.level);
        ref.current.recordSolve(key, s.score);
        // Count levels with all three stars, including this one.
        const best = { ...ref.current.progress.solved, [key]: Math.max(s.score, ref.current.progress.solved[key] ?? 0) };
        const perfect = LEVELS.filter((l) => starsFor(best[levelKey(PACK, l.index)] ?? 0) === 3).length;
        void reportProgress(`${ID}.perfect`, perfect);
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
              {BOXES.map((box, b) => (
                <optgroup key={box} label={box}>
                  {LEVELS.slice(b * PER_BOX, (b + 1) * PER_BOX).map((l) => {
                    const best = levels.progress.solved[levelKey(PACK, l.index)];
                    const mark = l.index > open ? ' 🔒' : best !== undefined ? ` ${starText(starsFor(best))}` : '';
                    return (
                      <option key={l.index} value={l.index} disabled={l.index > open}>
                        {`${l.index + 1}. ${l.name}${mark}`}
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
