import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const ticTacToeGame: GameDefinition = {
  id: 'tic-tac-toe',
  title: 'Tic-Tac-Toe',
  shortDescription: 'Classic three-in-a-row against a local AI or a friend on the same device.',
  fullDescription:
    'Tic-Tac-Toe with a proper opponent. The Hard computer searches the full game tree with alpha-beta pruning and plays perfectly, so the best result available to you is a draw. Easy and Normal deliberately leave openings. Two-player mode passes the device between players.',
  category: 'board',
  difficulty: 'easy',
  tags: ['classic', 'ai', 'two-player', 'featured', 'quick'],
  icon: '❌',
  accent: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
  controls: {
    mouse: ['Click a square to place your mark'],
    touch: ['Tap a square to place your mark'],
  },
  supportsTouch: true,
  supportsKeyboard: true,
  supportsMouse: true,
  multiplayer: 'local-multiplayer',
  estimatedMinutes: 2,
  hasHighScore: true,
  hasAchievements: true,
  status: 'available',
  instructions,
  achievements,
  related: ['connect-four', 'gomoku', 'checkers'],
  component: lazy(() => import('./TicTacToeGame')),
};
