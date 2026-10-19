import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { loadProgress, saveProgress } from '@/storage/StorageService';
import { ArcadeGame } from '../arcade/ArcadeGame';
import type { ArcadeSpec, BaseState } from '../arcade/kit';
import { isRecord } from '../puzzle/useSavedGame';
import './campaign.css';

export interface CampaignState extends BaseState {
  /** Furthest stage index reached this run. */
  reached: number;
}

export interface StartPoint {
  /** Stage index the run starts from. */
  index: number;
  label: string;
}

/**
 * Runs an arcade campaign (stages played in order with lives) and remembers
 * the furthest stage reached. Every unlocked start point (a world or a block
 * of stages) can be picked as the place to begin the next run.
 */
export function CampaignGame<S extends CampaignState>({
  gameId,
  makeSpec,
  starts,
  describe,
  maxHeight,
}: {
  gameId: string;
  /** Builds the spec once; `start()` gives the stage index the next run begins at. */
  makeSpec: (start: () => number) => ArcadeSpec<S>;
  starts: StartPoint[];
  /** Label for "continue playing", from the furthest stage index. */
  describe: (reached: number) => string;
  maxHeight?: number;
}) {
  const shell = useGameShell();
  const [reached, setReached] = useState(0);
  const reachedRef = useRef(0);
  const [start, setStart] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    let alive = true;
    void loadProgress(gameId).then((raw) => {
      if (!alive || !isRecord(raw) || typeof raw.reached !== 'number' || !Number.isInteger(raw.reached)) return;
      const n = Math.max(0, raw.reached);
      reachedRef.current = n;
      setReached(n);
    });
    return () => {
      alive = false;
    };
  }, [gameId]);

  const record = useCallback(
    (n: number) => {
      if (n <= reachedRef.current) return;
      reachedRef.current = n;
      setReached(n);
      void saveProgress(gameId, { reached: n }, { level: n + 1, label: describe(n) });
    },
    [describe, gameId],
  );
  const recordRef = useRef(record);
  recordRef.current = record;

  const spec = useMemo(() => {
    const base = makeSpec(() => startRef.current);
    let reported = 0;
    return {
      ...base,
      create: (d, r) => {
        reported = startRef.current;
        return base.create(d, r);
      },
      update: (s, dt, input, random) => {
        base.update(s, dt, input, random);
        if (s.reached > reported) {
          reported = s.reached;
          recordRef.current(s.reached);
        }
      },
    } as ArcadeSpec<S>;
    // The spec is built once; it reads the chosen start through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = starts.filter((p) => p.index <= reached);
  const pick = (index: number) => {
    if (index === startRef.current) return;
    startRef.current = index;
    setStart(index);
    shell.requestRestart();
  };

  return (
    <div className="campaign">
      {open.length > 1 && !shell.isFullscreen && (
        <div className="campaign-starts" role="radiogroup" aria-label="Start from">
          <span className="campaign-label">Start at</span>
          {open.map((p) => (
            <button
              key={p.index}
              type="button"
              role="radio"
              aria-checked={start === p.index}
              className={start === p.index ? 'on' : ''}
              onClick={() => pick(p.index)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      <ArcadeGame spec={spec} maxHeight={maxHeight} />
    </div>
  );
}
