import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const connectFourGame: GameDefinition = {
  id: 'connect-four',
  title: 'Connect Four',
  shortDescription: 'Drop discs and line up four in a row before the computer does.',
  fullDescription:
    'Drop coloured discs into a seven-by-six grid and race to connect four in a line. The computer opponent uses alpha-beta search with a positional heuristic, looking up to six moves ahead on Hard. Two-player mode lets you pass the device between friends.',
  category: 'board',
  difficulty: 'medium',
  tags: ['classic', 'ai', 'two-player', 'featured', 'strategy'],
  icon: '🔴',
  accent: 'linear-gradient(135deg, #1e40af, #ef4444)',
  controls: {
    mouse: ['Click a column to drop a disc'],
    touch: ['Tap a column to drop a disc'],
  },
  supportsTouch: true,
  supportsKeyboard: true,
  supportsMouse: true,
  multiplayer: 'local-multiplayer',
  estimatedMinutes: 4,
  hasHighScore: true,
  hasAchievements: true,
  status: 'available',
  instructions,
  achievements,
  related: ['tic-tac-toe', 'gomoku', 'reversi'],
  component: lazy(() => import('./ConnectFourGame')),
};
