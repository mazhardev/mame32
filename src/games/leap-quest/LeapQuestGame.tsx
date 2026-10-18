import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { highestUnlocked, levelKey, useLevelProgress } from '../_shared/puzzle/levels';
import { LEVEL_COUNT, LEVEL_NAMES } from './levels';
import { GAME_ID, makeSpec, reportClear } from './spec';
import './leap.css';

const PACK = 'quest';
const noSave = (_: unknown): _ is never => false;

/**
 * Leap Quest: a level picker (any level reached so far) above the arcade
 * runner. A run starts at the picked level and carries on through the rest
 * of the quest until Pip runs out of lives.
 */
export default function LeapQuestGame() {
  const shell = useGameShell();
  const lp = useLevelProgress<never>(GAME_ID, noSave, { packNames: { [PACK]: 'Level' }, better: (a, b) => a > b });
  const unlocked = highestUnlocked(lp.progress.solved, PACK, LEVEL_COUNT);
  const startRef = useRef<number | null>(null);
  const [start, setStart] = useState(0);
  const recordRef = useRef(lp.recordSolve);
  recordRef.current = lp.recordSolve;

  // Once saved progress has loaded, begin at the furthest level reached.
  useEffect(() => {
    if (lp.loading || startRef.current !== null) return;
    startRef.current = unlocked;
    setStart(unlocked);
  }, [lp.loading, unlocked]);

  const spec = useMemo(
    () =>
      makeSpec({
        startLevel: () => startRef.current ?? 0,
        hooks: {
          onLevelClear: (index, s) => {
            recordRef.current(levelKey(PACK, index), s.score);
            reportClear(index, s);
          },
        },
      }),
    [],
  );

  if (lp.loading || startRef.current === null) return <p className="lq-loading">Packing Pip’s scarf…</p>;

  const pick = (i: number) => {
    startRef.current = i;
    setStart(i);
    shell.requestRestart();
  };

  return (
    <div className="lq">
      <label className="lq-pick">
        <span>Start at</span>
        <select
          className="select"
          value={start}
          onChange={(e) => {
            pick(Number(e.target.value));
            // Hand the keyboard back to the game so Space starts the run.
            e.currentTarget.blur();
          }}
          disabled={shell.paused}
        >
          {LEVEL_NAMES.map((name, i) => (
            <option key={name} value={i} disabled={i > unlocked}>
              {i > unlocked ? `🔒 ${name}` : lp.progress.solved[levelKey(PACK, i)] !== undefined ? `✓ ${name}` : name}
            </option>
          ))}
        </select>
      </label>
      <ArcadeGame spec={spec} />
    </div>
  );
}
