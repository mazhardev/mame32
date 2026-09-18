import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const minesweeperGame: GameDefinition = {
  id: 'minesweeper',
  title: 'Minesweeper',
  shortDescription: 'Clear the board using number clues without detonating a mine.',
  fullDescription:
    'The logic classic. Numbers tell you how many mines touch a square; deduce which squares are safe and clear the whole board. The first click is always safe, chord-clicking speeds up solved areas, and best times are tracked separately for each board size.',
  category: 'puzzle',
  difficulty: 'medium',
  tags: ['logic', 'grid', 'classic', 'featured', 'deduction'],
  icon: '💣',
  accent: 'linear-gradient(135deg, #475569, #0ea5e9)',
  controls: {
    mouse: ['Left click to reveal', 'Right click to flag', 'Left click a satisfied number to chord'],
    touch: ['Tap to reveal', 'Long-press or use Flag mode to flag', 'Tap a satisfied number to chord'],
  },
  supportsTouch: true,
  supportsKeyboard: false,
  supportsMouse: true,
  multiplayer: 'single',
  estimatedMinutes: 6,
  hasHighScore: true,
  hasAchievements: true,
  status: 'available',
  instructions,
  achievements,
  related: ['sudoku', 'nonogram', 'lights-out'],
  component: lazy(() => import('./MinesweeperGame')),
};
