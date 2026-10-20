import { useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { ModePicker } from '../_shared/board/BoardUI';
import type { PlayMode } from '../_shared/board/BoardUI';
import { makeSpec } from './spec';
import './carrom.css';

export default function CarromGame() {
  const shell = useGameShell();
  const [mode, setMode] = useState<PlayMode>('ai');
  const modeRef = useRef<PlayMode>('ai');
  const spec = useMemo(() => makeSpec(() => modeRef.current), []);
  return (
    <div className="carrom">
      {!shell.isFullscreen && (
        <div className="carrom-modes">
          <ModePicker
            mode={mode}
            onChange={(m) => {
              if (m === modeRef.current) return;
              modeRef.current = m;
              setMode(m);
              shell.requestRestart();
            }}
          />
        </div>
      )}
      <ArcadeGame spec={spec} maxHeight={0.82} />
    </div>
  );
}
