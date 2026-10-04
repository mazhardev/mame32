import { useMemo, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { ModePicker } from '../_shared/board/BoardUI';
import type { PlayMode } from '../_shared/board/BoardUI';
import { makeSpec } from './game';

export default function CannonBattleGame() {
  const shell = useGameShell();
  const [mode, setMode] = useState<PlayMode>('ai');
  const spec = useMemo(() => makeSpec(mode === 'ai'), [mode]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
      <ModePicker
        mode={mode}
        onChange={(m) => {
          setMode(m);
          shell.clearResult();
        }}
      />
      {/* Remount on mode change so the round restarts with the new opponent. */}
      <ArcadeGame key={mode} spec={spec} />
    </div>
  );
}
