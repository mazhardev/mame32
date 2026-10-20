import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { loadProgress, saveProgress } from '@/storage/StorageService';
import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { isRecord } from '../_shared/puzzle/useSavedGame';
import '../_shared/board/board.css';
import '../_shared/platform/campaign.css';
import { START_POINTS, describe, makeSpec } from './spec';
import type { Mode, State } from './world';

const ID = 'blast-maze';

export default function BlastMazeGame() {
  const shell = useGameShell();
  const [mode, setMode] = useState<Mode>('adventure');
  const modeRef = useRef<Mode>('adventure');
  const [start, setStart] = useState(0);
  const startRef = useRef(0);
  const [reached, setReached] = useState(0);
  const reachedRef = useRef(0);

  useEffect(() => {
    let alive = true;
    void loadProgress(ID).then((raw) => {
      if (!alive || !isRecord(raw) || typeof raw.reached !== 'number' || !Number.isInteger(raw.reached)) return;
      reachedRef.current = Math.max(0, raw.reached);
      setReached(reachedRef.current);
    });
    return () => {
      alive = false;
    };
  }, []);

  const spec = useMemo(() => {
    const base = makeSpec(
      () => modeRef.current,
      () => startRef.current,
    );
    return {
      ...base,
      update: (s, dt, input, random) => {
        base.update(s, dt, input, random);
        if (s.mode === 'adventure' && s.reached > reachedRef.current) {
          reachedRef.current = s.reached;
          setReached(s.reached);
          void saveProgress(ID, { reached: s.reached }, { level: s.reached + 1, label: describe(s.reached) });
        }
      },
    } as ArcadeSpec<State>;
  }, []);

  const pickMode = (m: Mode) => {
    if (m === modeRef.current) return;
    modeRef.current = m;
    setMode(m);
    shell.requestRestart();
  };
  const pickStart = (i: number) => {
    if (i === startRef.current) return;
    startRef.current = i;
    setStart(i);
    shell.requestRestart();
  };
  const open = START_POINTS.filter((p) => p.index <= reached);

  return (
    <div className="campaign">
      {!shell.isFullscreen && (
        <div className="campaign-starts">
          <div className="seg" role="radiogroup" aria-label="Game mode">
            {(['adventure', 'battle'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => pickMode(m)}>
                {m === 'adventure' ? 'Adventure' : 'Battle vs 3 bots'}
              </button>
            ))}
          </div>
        </div>
      )}
      {!shell.isFullscreen && mode === 'adventure' && open.length > 1 && (
        <div className="campaign-starts" role="radiogroup" aria-label="Start from">
          <span className="campaign-label">Start at</span>
          {open.map((p) => (
            <button key={p.index} type="button" role="radio" aria-checked={start === p.index} className={start === p.index ? 'on' : ''} onClick={() => pickStart(p.index)}>
              {p.label}
            </button>
          ))}
        </div>
      )}
      <ArcadeGame spec={spec} maxHeight={0.78} />
    </div>
  );
}
