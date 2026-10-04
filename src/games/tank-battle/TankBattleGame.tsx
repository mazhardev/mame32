'use client';

import { useMemo, useState } from 'react';
import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { makeSpec } from './game';
import type { Mode } from './game';

export default function TankBattleGame() {
  const [mode, setMode] = useState<Mode>('cpu');
  const spec = useMemo(() => makeSpec(mode), [mode]);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={mode}
          aria-label="Game mode"
          onChange={(e) => {
            setMode(e.target.value as Mode);
            // Hand the arrow keys back to the game.
            e.currentTarget.blur();
          }}
        >
          <option value="cpu">vs Computer</option>
          <option value="duo">Two players (one keyboard)</option>
        </select>
      </div>
      <ArcadeGame key={mode} spec={spec} />
    </div>
  );
}
