import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const sudokuGame: GameDefinition = {
  id: 'sudoku',
  title: 'Sudoku',
  shortDescription: 'Fill the grid so every row, column and box holds the digits 1 to 9.',
  fullDescription:
    'A full Sudoku with a puzzle generator that guarantees a unique solution, so you never have to guess. Pencil in notes, spot conflicts as you go, take a hint when you are stuck, and pick up an unfinished grid later — progress is saved automatically.',
  category: 'puzzle',
  difficulty: 'medium',
  tags: ['logic', 'numbers', 'classic', 'featured', 'save'],
  icon: '🔢',
  accent: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
  controls: {
    keyboard: ['1–9 to enter a digit', 'Backspace to clear', 'Arrow keys to move', 'N to toggle notes'],
    mouse: ['Click a cell, then click a digit'],
    touch: ['Tap a cell, then tap a digit on the pad'],
  },
  supportsTouch: true,
  supportsKeyboard: true,
  supportsMouse: true,
  multiplayer: 'single',
  estimatedMinutes: 15,
  hasHighScore: true,
  hasAchievements: true,
  hasSaveState: true,
  status: 'available',
  instructions,
  achievements,
  related: ['minesweeper', 'kakuro', 'nonogram'],
  component: lazy(() => import('./SudokuGame')),
};
