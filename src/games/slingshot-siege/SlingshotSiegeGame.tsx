import { useMemo, useRef } from 'react';
import { reportProgress } from '@/achievements/AchievementService';
import { useGameShell } from '@/game-engine/context';
import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { highestUnlocked, levelKey, usePackLevels } from '../_shared/puzzle/levels';
import '../_shared/puzzle/puzzle.css';
import '../_shared/platform/campaign.css';
import type { State } from './game';
import { LEVEL_COUNT, PER_WORLD, WORLDS, level } from './levels';
import { ID, makeSpec, starText } from './spec';

const PACK = 'forts';
const NAMES = Array.from({ length: LEVEL_COUNT }, (_, i) => level(i).name);

/** Best results are stored as stars × 1,000,000 + score, so more stars always wins. */
const encode = (stars: number, score: number) => stars * 1_000_000 + Math.min(999_999, Math.max(0, score));
const starsOf = (best: number | undefined) => (best === undefined ? 0 : Math.floor(best / 1_000_000));
const noSave = (_: unknown): _ is never => false;

export default function SlingshotSiegeGame() {
  const shell = useGameShell();
  const levels = usePackLevels(ID, PACK, LEVEL_COUNT, noSave, shell.requestRestart, {
    packNames: { [PACK]: 'Forts' },
    better: (a, b) => a > b,
  });
  const levelsRef = useRef(levels);
  levelsRef.current = levels;

  const spec = useMemo(() => {
    const base = makeSpec(() => levelsRef.current.indexRef.current);
    return {
      ...base,
      onEnd: (s, d) => {
        base.onEnd?.(s, d);
        if (!s.won) return;
        const lv = levelsRef.current;
        const key = levelKey(PACK, s.level);
        lv.recordSolve(key, encode(s.stars, s.score));
        const solved = { ...lv.progress.solved };
        solved[key] = Math.max(solved[key] ?? 0, encode(s.stars, s.score));
        let total = 0;
        for (let i = 0; i < LEVEL_COUNT; i++) total += starsOf(solved[levelKey(PACK, i)]);
        void reportProgress(`${ID}.stars`, total);
        WORLDS.forEach((_, w) => {
          let done = 0;
          for (let i = w * PER_WORLD; i < (w + 1) * PER_WORLD; i++) if (solved[levelKey(PACK, i)] !== undefined) done++;
          void reportProgress(`${ID}.world${w + 1}`, done);
        });
      },
      result: (s) => {
        const r = base.result(s);
        if (!s.won || s.level >= LEVEL_COUNT - 1) return r;
        return { ...r, next: { label: 'Next level →', action: () => levelsRef.current.select(s.level + 1) } };
      },
    } as ArcadeSpec<State>;
  }, []);

  if (!levels.ready) return <div className="campaign" aria-busy="true" />;

  const solved = levels.progress.solved;
  const open = highestUnlocked(solved, PACK, LEVEL_COUNT);
  let total = 0;
  for (let i = 0; i < LEVEL_COUNT; i++) total += starsOf(solved[levelKey(PACK, i)]);
  const index = levels.index;

  return (
    <div className="campaign">
      {!shell.isFullscreen && (
        <div className="campaign-starts">
          <div className="pz-levels">
            <button
              type="button"
              className="icon-btn"
              onClick={() => levels.select(index - 1)}
              disabled={index === 0}
              aria-label="Previous level"
            >
              ◀
            </button>
            <select className="select" value={index} aria-label="Level" onChange={(e) => levels.select(Number(e.target.value))}>
              {WORLDS.map((world, w) => (
                <optgroup key={world} label={world}>
                  {NAMES.slice(w * PER_WORLD, (w + 1) * PER_WORLD).map((name, k) => {
                    const i = w * PER_WORLD + k;
                    const best = solved[levelKey(PACK, i)];
                    const tag = i > open ? ' 🔒' : best !== undefined ? ` ${starText(starsOf(best))}` : '';
                    return (
                      <option key={i} value={i} disabled={i > open}>
                        {`${i + 1}. ${name}${tag}`}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              className="icon-btn"
              onClick={() => levels.select(index + 1)}
              disabled={index >= open}
              aria-label="Next level"
            >
              ▶
            </button>
          </div>
          <span className="campaign-label" aria-label={`${total} of ${LEVEL_COUNT * 3} stars`}>
            ★ {total}/{LEVEL_COUNT * 3}
          </span>
        </div>
      )}
      <ArcadeGame spec={spec} maxHeight={0.74} />
    </div>
  );
}
