import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { highestUnlocked, levelKey, useLevelProgress } from '../puzzle/levels';
import { ArcadeGame } from './ArcadeGame';
import type { ArcadeSpec, BaseState } from './kit';
import './picker.css';

const noSave = (_: unknown): _ is never => false;

export interface PickerHooks {
  /** Where the next run begins. */
  startLevel: () => number;
  /** Call when a level (stage, floor…) is cleared, to unlock the next one. */
  onClear: (index: number, score: number) => void;
}

/**
 * An arcade game played as a run through numbered levels, with a picker to
 * start from any level reached so far. Progress is saved per level (best
 * score), so it also appears under "Continue playing".
 */
export function StartPickerGame<S extends BaseState>({
  gameId,
  pack,
  names,
  makeSpec,
  loading,
  label = 'Start at',
}: {
  gameId: string;
  pack: string;
  names: string[];
  makeSpec: (hooks: PickerHooks) => ArcadeSpec<S>;
  loading: string;
  label?: string;
}) {
  const shell = useGameShell();
  const lp = useLevelProgress<never>(gameId, noSave, { packNames: { [pack]: 'Level' }, better: (a, b) => a > b });
  const unlocked = highestUnlocked(lp.progress.solved, pack, names.length);
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

  const makeRef = useRef(makeSpec);
  const spec = useMemo(
    () =>
      makeRef.current({
        startLevel: () => startRef.current ?? 0,
        onClear: (index, score) => recordRef.current(levelKey(pack, index), score),
      }),
    [pack],
  );

  if (lp.loading || startRef.current === null) return <p className="picker-loading">{loading}</p>;

  const pick = (i: number) => {
    startRef.current = i;
    setStart(i);
    shell.requestRestart();
  };

  return (
    <div className="picker-run">
      <label className="picker-pick">
        <span>{label}</span>
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
          {names.map((name, i) => (
            <option key={name} value={i} disabled={i > unlocked}>
              {i > unlocked ? `🔒 ${name}` : lp.progress.solved[levelKey(pack, i)] !== undefined ? `✓ ${name}` : name}
            </option>
          ))}
        </select>
      </label>
      <ArcadeGame spec={spec} />
    </div>
  );
}
