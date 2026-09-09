import { createContext, useContext } from 'react';
import type { SoundName } from '@/services/audio';
import type { DifficultySetting, GameDefinition } from '@/types';

export interface GameOverPayload {
  /** Headline shown on the result screen. */
  title?: string;
  won?: boolean;
  lost?: boolean;
  draw?: boolean;
  score?: number;
  scoreLabel?: string;
  /** Extra rows rendered on the result card, e.g. level reached. */
  details?: { label: string; value: string }[];
  timeMs?: number;
  coins?: number;
  mode?: string;
  message?: string;
}

export interface GameShellApi {
  game: GameDefinition;
  paused: boolean;
  setPaused: (paused: boolean) => void;
  togglePause: () => void;
  soundEnabled: boolean;
  difficulty: DifficultySetting;
  setDifficulty: (d: DifficultySetting) => void;
  isFullscreen: boolean;
  /** Registers the game's own reset routine so the toolbar Restart works. */
  registerRestart: (fn: () => void) => void;
  /** Tells the shell whether pause/restart controls apply to this game. */
  setCapabilities: (caps: { pausable?: boolean; restartable?: boolean }) => void;
  requestRestart: () => void;
  /** Called by a game when a round starts — records statistics and play time. */
  startRound: () => void;
  /** Called when a round finishes; shows the result screen. */
  endRound: (payload: GameOverPayload) => void;
  /** Dismisses the result overlay without starting a new round. */
  clearResult: () => void;
  personalBest: number | null;
  play: (sound: SoundName) => void;
  vibrate: (pattern: number | number[]) => void;
}

export const GameShellContext = createContext<GameShellApi | null>(null);

export function useGameShell(): GameShellApi {
  const ctx = useContext(GameShellContext);
  if (!ctx) throw new Error('useGameShell must be used inside a GameShell');
  return ctx;
}
